import "server-only";

import { saveProductToDb } from "@/features/products/db/product-db-persistence";
import { useCatalogProductsDb } from "@/features/products/products-source";
import { productRepository } from "@/repositories/product.repository";
import { normalizeImportedProduct, resolveImportSlug } from "./product-normalizer";
import { validateImportedProduct, importItemWarnings } from "./product-validator";
import type {
  ProductImportBatchResult,
  ProductImportData,
  ProductImportUpsertOptions,
} from "./product-import.types";

export async function importProductsToStorage(
  locale: string,
  items: ProductImportData[],
  opts: ProductImportUpsertOptions,
): Promise<ProductImportBatchResult> {
  if (!useCatalogProductsDb()) {
    throw new Error("Product import requires database catalog mode (Supabase PostgreSQL)");
  }

  const loc = locale.toLowerCase();
  const results: ProductImportBatchResult["results"] = [];
  let ok = 0;
  let skipped = 0;
  let error = 0;

  for (const item of items) {
    const row: ProductImportBatchResult["results"][number] = {
      slug: "",
      status: "error",
      errors: [],
      warnings: [],
      sourceFile: item.sourceFile,
    };

    try {
      const slug = resolveImportSlug(item.product);
      if (!slug) {
        row.errors.push("Missing valid slug (slug, id, or title)");
        row.slug = "(no-slug)";
        results.push(row);
        error += 1;
        continue;
      }
      row.slug = slug;

      if (opts.duplicatePolicy === "skip") {
        const exists = await productRepository.exists(slug);
        if (exists) {
          row.status = "skipped";
          row.warnings.push(`Skipped existing product "${slug}"`);
          results.push(row);
          skipped += 1;
          continue;
        }
      }

      const product = normalizeImportedProduct(item.product, slug);
      const validation = validateImportedProduct(product);
      if (!validation.ok) {
        row.errors.push(validation.message);
        results.push(row);
        error += 1;
        continue;
      }

      row.warnings.push(...importItemWarnings(item.product, item.pairedCsv));

      if (opts.dryRun) {
        row.status = "ok";
        row.warnings.push("Dry run — no data written");
        results.push(row);
        ok += 1;
        continue;
      }

      const meta = {
        sourceType: opts.sourceType ?? "json",
        sourceFile: item.sourceFile ?? opts.sourceFile ?? null,
      };

      await saveProductToDb(slug, validation.product, {
        ...meta,
        localeCode: loc,
        localizedSlug: slug,
      });

      row.status = "ok";
      results.push(row);
      ok += 1;
    } catch (e) {
      row.errors.push(e instanceof Error ? e.message : String(e));
      results.push(row);
      error += 1;
    }
  }

  return {
    summary: { total: items.length, ok, skipped, error },
    results,
  };
}

export function rawRowsToImportData(
  rows: Record<string, unknown>[],
  sourceFile?: string,
): ProductImportData[] {
  return rows.map((product) => ({
    slug: resolveImportSlug(product) ?? "",
    product,
    sourceFile,
  }));
}
