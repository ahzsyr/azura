#!/usr/bin/env tsx
/**
 * Reindex migrated product ContentItems and optionally remove legacy CATALOG_PRODUCT docs.
 *
 * Usage:
 *   npm run entities:reindex-products
 *   npm run entities:reindex-products -- --remove-legacy
 */
import { PrismaClient } from "@prisma/client";
import { searchIndexer } from "@/capabilities/search/search-indexer.service";
import { PRODUCT_CONTENT_TYPE_SLUG, isMigratedProductItem } from "@/features/entities/migration/metadata";

const prisma = new PrismaClient();

async function main() {
  const removeLegacy = process.argv.includes("--remove-legacy");
  const contentType = await prisma.contentType.findUnique({
    where: { slug: PRODUCT_CONTENT_TYPE_SLUG },
    include: { collections: true },
  });
  if (!contentType) {
    throw new Error(`Missing ContentType: ${PRODUCT_CONTENT_TYPE_SLUG}`);
  }

  const items = await prisma.contentItem.findMany({
    where: { contentTypeId: contentType.id, deletedAt: null },
    include: { contentType: true, collection: true },
  });

  const migrated = items.filter((item) => isMigratedProductItem(item.metadata));
  console.log(`Reindexing ${migrated.length} migrated product content items`);

  for (const item of migrated) {
    await searchIndexer.indexContentItem({
      id: item.id,
      slug: item.slug,
      attributes: item.attributes,
      metadata: item.metadata,
      blocks: item.blocks,
      status: item.status,
      isVisible: item.isVisible,
      contentType: item.contentType,
      collection: item.collection ? { id: item.collection.id, slug: item.collection.slug } : null,
    });
  }

  if (removeLegacy) {
    const deleted = await prisma.searchDocument.deleteMany({
      where: { entityType: "CATALOG_PRODUCT" },
    });
    console.log(`Removed ${deleted.count} CATALOG_PRODUCT search documents`);
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
