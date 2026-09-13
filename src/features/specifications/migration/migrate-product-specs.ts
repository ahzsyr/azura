/**
 * Idempotent product specification migration:
 * backfill canonical_specs on DB payloads missing them.
 */
import "server-only";

import { prisma } from "@/lib/prisma";
import type { Product } from "@/features/products/types";
import { ensureCanonicalSpecsOnProduct } from "@/features/specifications/normalize-product-specs";

export type ProductSpecMigrationReport = {
  scanned: number;
  updated: number;
  skipped: number;
  dryRun: boolean;
  samples: Array<{
    slug: string;
    canonicalCount: number;
    unmapped: number;
    ambiguous: number;
  }>;
  errors: string[];
};

function hasCanonicalSpecs(product: Product): boolean {
  return Boolean(product.canonical_specs && Object.keys(product.canonical_specs).length > 0);
}

export async function migrateProductSpecs(options?: {
  dryRun?: boolean;
  limit?: number;
}): Promise<ProductSpecMigrationReport> {
  const dryRun = options?.dryRun ?? false;
  const report: ProductSpecMigrationReport = {
    scanned: 0,
    updated: 0,
    skipped: 0,
    dryRun,
    samples: [],
    errors: [],
  };

  const rows = await prisma.product.findMany({
    select: { id: true, canonicalSlug: true, payload: true },
    orderBy: { updatedAt: "asc" },
    ...(options?.limit ? { take: options.limit } : {}),
  });

  for (const row of rows) {
    report.scanned += 1;
    try {
      const payload = row.payload as unknown as Product;
      if (!payload || typeof payload !== "object") {
        report.skipped += 1;
        continue;
      }
      if (hasCanonicalSpecs(payload)) {
        report.skipped += 1;
        continue;
      }

      const normalized = ensureCanonicalSpecsOnProduct(payload);
      const canonicalCount = Object.keys(normalized.canonical_specs || {}).length;
      if (!canonicalCount) {
        report.skipped += 1;
        continue;
      }

      if (report.samples.length < 20) {
        report.samples.push({
          slug: row.canonicalSlug,
          canonicalCount,
          unmapped: normalized.unmapped_specs?.length || 0,
          ambiguous: normalized.ambiguous_specs?.length || 0,
        });
      }

      if (dryRun) {
        report.updated += 1;
        continue;
      }

      await prisma.product.update({
        where: { id: row.id },
        data: { payload: normalized as unknown as object },
      });
      report.updated += 1;
    } catch (error) {
      report.errors.push(
        `${row.canonicalSlug}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  return report;
}
