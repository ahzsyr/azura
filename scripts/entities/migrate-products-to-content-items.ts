#!/usr/bin/env tsx
/**
 * Migrate Product rows → ContentItem under the products ContentType.
 *
 * Usage:
 *   npm run entities:migrate-products
 *   npm run entities:migrate-products -- --dry-run
 */
import { PrismaClient } from "@prisma/client";
import { ensureBuiltinContentTypes } from "@/features/content/content-data.service";
import { PRODUCT_CONTENT_TYPE_SLUG } from "@/features/entities/migration/metadata";
import { mapDbProductRowToContentItemData } from "@/features/entities/migration/product-mapper";
import { syncProductToContentItem } from "@/features/entities/migration/sync-product-content-item";
import { fromDbRow } from "@/features/products/db/product-db-mapper";

const prisma = new PrismaClient();

function parseArgs() {
  return { dryRun: process.argv.includes("--dry-run") };
}

async function repointLocalizedSlugs(productId: string, contentItemId: string) {
  await prisma.localizedSlug.updateMany({
    where: { entityType: "Product", entityId: productId },
    data: { entityType: "ContentItem", entityId: contentItemId },
  });
}

async function main() {
  const { dryRun } = parseArgs();
  console.log(`Migrating Product → ContentItem${dryRun ? " (dry run)" : ""}\n`);

  await ensureBuiltinContentTypes();
  const contentType = await prisma.contentType.findUnique({
    where: { slug: PRODUCT_CONTENT_TYPE_SLUG },
  });
  if (!contentType) {
    throw new Error(`Missing ContentType: ${PRODUCT_CONTENT_TYPE_SLUG}`);
  }

  const products = await prisma.product.findMany({ orderBy: { canonicalSlug: "asc" } });
  let created = 0;
  let skipped = 0;
  let errors = 0;

  for (const row of products) {
    const existing = await prisma.contentItem.findFirst({
      where: {
        contentTypeId: contentType.id,
        slug: row.canonicalSlug,
        deletedAt: null,
      },
    });
    if (existing) {
      skipped += 1;
      continue;
    }

    if (dryRun) {
      console.log(`  would migrate: ${row.canonicalSlug}`);
      created += 1;
      continue;
    }

    try {
      const product = fromDbRow(row);
      const result = await syncProductToContentItem({
        canonicalSlug: row.canonicalSlug,
        product,
        legacyProductId: row.id,
        collectionSlugs: Array.isArray(row.collectionSlugs)
          ? row.collectionSlugs.filter((s): s is string => typeof s === "string")
          : [],
        status: mapDbProductRowToContentItemData(row, contentType.id).status,
      });

      await repointLocalizedSlugs(row.id, result.contentItemId);
      created += 1;
      console.log(`  migrated: ${row.canonicalSlug} → ${result.contentItemId}`);
    } catch (error) {
      errors += 1;
      console.error(
        `  error: ${row.canonicalSlug}`,
        error instanceof Error ? error.message : error,
      );
    }
  }

  console.log(`\nDone. created=${created} skipped=${skipped} errors=${errors}`);
  if (errors > 0) process.exit(1);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
