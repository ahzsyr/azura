#!/usr/bin/env tsx
/**
 * Inventory catalog storage before Phase 3 migration.
 *
 * Usage: npm run entities:inventory
 */
import { PrismaClient } from "@prisma/client";
import {
  PRODUCT_CONTENT_TYPE_SLUG,
  isMigratedProductItem,
} from "@/features/entities/migration/metadata";

const prisma = new PrismaClient();

async function main() {
  console.log("Phase 3 catalog storage inventory\n");

  const productCount = await prisma.product.count();
  const productsType = await prisma.contentType.findUnique({
    where: { slug: PRODUCT_CONTENT_TYPE_SLUG },
    include: { _count: { select: { items: true } } },
  });

  const contentItems = productsType
    ? await prisma.contentItem.findMany({
        where: { contentTypeId: productsType.id, deletedAt: null },
        select: { slug: true, metadata: true },
      })
    : [];
  const migratedItems = contentItems.filter((item) => isMigratedProductItem(item.metadata)).length;

  const productSlugs = new Set(
    (await prisma.product.findMany({ select: { canonicalSlug: true } })).map(
      (row) => row.canonicalSlug,
    ),
  );

  const contentProductSlugs = contentItems
    .map((row) => row.slug)
    .filter((slug): slug is string => Boolean(slug));

  const slugCollisions = contentProductSlugs.filter((slug) => productSlugs.has(slug));

  const localizedProductSlugs = await prisma.localizedSlug.count({
    where: { entityType: "Product" },
  });
  const productTranslations = await prisma.entityTranslation.count({
    where: { entityType: "Product" },
  });

  const catalogCollections = await prisma.catalogCollection.count();
  const contentCollections = await prisma.contentCollection.count();

  console.log(`Product rows:                    ${productCount}`);
  console.log(`ContentType "${PRODUCT_CONTENT_TYPE_SLUG}":     ${productsType ? "yes" : "no"}`);
  console.log(`ContentItem (products type):     ${productsType?._count.items ?? 0}`);
  console.log(`ContentItem (migration.product): ${migratedItems}`);
  console.log(`Slug collisions (Product∩CI):    ${slugCollisions.length}`);
  if (slugCollisions.length > 0) {
    console.log(`  examples: ${slugCollisions.slice(0, 5).join(", ")}`);
  }
  console.log(`LocalizedSlug (Product):         ${localizedProductSlugs}`);
  console.log(`EntityTranslation (Product):     ${productTranslations}`);
  console.log(`CatalogCollection rows:          ${catalogCollections}`);
  console.log(`ContentCollection rows:          ${contentCollections}`);

  const searchProducts = await prisma.searchDocument.count({
    where: { entityType: "CATALOG_PRODUCT" },
  });
  const searchContentItems = await prisma.searchDocument.count({
    where: { entityType: "CONTENT_ITEM" },
  });
  console.log(`SearchDocument CATALOG_PRODUCT:  ${searchProducts}`);
  console.log(`SearchDocument CONTENT_ITEM:     ${searchContentItems}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
