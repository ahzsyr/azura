import "server-only";

import type { EntityPresetId, EntitySaveResult, EntityWriteInput } from "@/features/entities/types";
import { syncProductToContentItem } from "@/features/entities/migration/sync-product-content-item";
import type { Product } from "@/features/products/types";
import { mapProductStatusToContentStatus } from "@/features/entities/migration/product-mapper";

export async function saveProductEntity(input: EntityWriteInput): Promise<EntitySaveResult> {
  const slug = (input.slug ?? input.fields.slug ?? input.id ?? "").toString().trim();
  if (!slug) {
    throw new Error("Product entity requires slug");
  }

  const product = input.fields as unknown as Product;
  const result = await syncProductToContentItem({
    canonicalSlug: slug,
    product,
    legacyProductId: input.id,
    collectionSlugs: input.collectionSlugs,
    status: input.status ?? mapProductStatusToContentStatus(product.availability),
    localeCode: input.localeCode,
    localizedSlug: input.localizedSlug ?? slug,
  });

  return {
    ref: {
      presetId: "product" as EntityPresetId,
      storage: "content_item",
      id: result.contentItemId,
      slug,
    },
    created: result.created,
  };
}

export async function deleteProductEntity(idOrSlug: string): Promise<void> {
  const { prisma } = await import("@/lib/prisma");
  const { PRODUCT_CONTENT_TYPE_SLUG } = await import("@/features/entities/migration/metadata");
  const { ensureBuiltinContentTypes } = await import("@/features/content/content-data.service");

  await ensureBuiltinContentTypes();
  const type = await prisma.contentType.findUnique({ where: { slug: PRODUCT_CONTENT_TYPE_SLUG } });
  if (!type) return;

  const key = idOrSlug.trim();
  const item = await prisma.contentItem.findFirst({
    where: {
      contentTypeId: type.id,
      deletedAt: null,
      OR: [{ id: key }, { slug: key }],
    },
  });
  if (!item) return;

  await prisma.contentItem.update({
    where: { id: item.id },
    data: { deletedAt: new Date(), isVisible: false },
  });

  const { searchIndexer } = await import("@/capabilities/search/search-indexer.service");
  await searchIndexer.remove("CONTENT_ITEM", item.id);
}
