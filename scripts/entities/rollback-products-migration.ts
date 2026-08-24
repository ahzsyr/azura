#!/usr/bin/env tsx
/**
 * Roll back Product → ContentItem migration rows.
 *
 * Usage: npm run entities:rollback-products
 *        npm run entities:rollback-products -- --dry-run
 */
import { PrismaClient } from "@prisma/client";
import { PRODUCT_CONTENT_TYPE_SLUG, isMigratedProductItem } from "@/features/entities/migration/metadata";

const prisma = new PrismaClient();

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  const contentType = await prisma.contentType.findUnique({
    where: { slug: PRODUCT_CONTENT_TYPE_SLUG },
  });
  if (!contentType) {
    console.log("No products ContentType — nothing to roll back.");
    return;
  }

  const items = await prisma.contentItem.findMany({
    where: { contentTypeId: contentType.id, deletedAt: null },
    select: { id: true, slug: true, metadata: true },
  });

  const migrated = items.filter((item) => isMigratedProductItem(item.metadata));
  console.log(`Found ${migrated.length} migrated product ContentItem rows`);

  for (const item of migrated) {
    if (dryRun) {
      console.log(`  would delete: ${item.slug ?? item.id}`);
      continue;
    }
    await prisma.contentItemMedia.deleteMany({ where: { itemId: item.id } });
    await prisma.entityTranslation.deleteMany({
      where: { entityType: "ContentItem", entityId: item.id },
    });
    await prisma.localizedSlug.deleteMany({
      where: { entityType: "ContentItem", entityId: item.id },
    });
    await prisma.searchDocument.deleteMany({
      where: { entityType: "CONTENT_ITEM", entityId: item.id },
    });
    await prisma.contentItem.delete({ where: { id: item.id } });
    console.log(`  deleted: ${item.slug ?? item.id}`);
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
