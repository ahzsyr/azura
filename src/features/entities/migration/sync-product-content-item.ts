import "server-only";

import type { ContentStatus } from "@prisma/client";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ensureBuiltinContentTypes } from "@/features/content/content-data.service";
import { contentRepository } from "@/features/content/content.repository";
import { PRODUCT_CONTENT_TYPE_SLUG, buildProductMigrationMetadata } from "@/features/entities/migration/metadata";
import {
  mapProductStatusToContentStatus,
  mapProductToContentAttributes,
  PRODUCT_TO_CONTENT_TRANSLATION_FIELDS,
} from "@/features/entities/migration/product-mapper";
import type { Product } from "@/features/products/types";
import { normalizeProductPayload } from "@/features/products/lib/product-payload-normalize";
import { translationService } from "@/features/translation/translation.service";
import { searchIndexer } from "@/capabilities/search/search-indexer.service";

export type SyncProductToContentItemInput = {
  canonicalSlug: string;
  product: Product;
  legacyProductId?: string;
  collectionSlugs?: string[];
  status?: ContentStatus;
  localeCode?: string;
  localizedSlug?: string;
};

export type SyncProductToContentItemResult = {
  contentItemId: string;
  created: boolean;
};

async function ensureProductsContentTypeId(): Promise<string> {
  await ensureBuiltinContentTypes();
  const type = await contentRepository.getTypeBySlug(PRODUCT_CONTENT_TYPE_SLUG);
  if (!type) {
    throw new Error(`Missing ContentType: ${PRODUCT_CONTENT_TYPE_SLUG}`);
  }
  return type.id;
}

async function copyProductTranslationsToContentItem(
  legacyProductId: string,
  contentItemId: string,
): Promise<void> {
  const rows = await prisma.entityTranslation.findMany({
    where: { entityType: "Product", entityId: legacyProductId },
  });
  if (rows.length === 0) return;

  await translationService.upsertMany(
    rows.map((row) => ({
      entityType: "ContentItem",
      entityId: contentItemId,
      field: PRODUCT_TO_CONTENT_TRANSLATION_FIELDS[row.field] ?? row.field,
      localeCode: row.localeCode,
      value: row.value,
      status: row.status,
    })),
  );
}

async function upsertProductSlugTranslation(
  contentItemId: string,
  localeCode: string,
  slug: string,
): Promise<void> {
  await translationService.upsertSlug("ContentItem", contentItemId, localeCode, slug);
}

async function syncProductMedia(contentItemId: string, product: Product): Promise<void> {
  const images = product.media?.images?.filter((img) => img?.url?.trim()) ?? [];
  if (images.length === 0) return;

  await prisma.contentItemMedia.deleteMany({ where: { itemId: contentItemId } });

  await prisma.contentItemMedia.createMany({
    data: images.map((image, index) => ({
      itemId: contentItemId,
      url: image.url!.trim(),
      sortOrder: index,
      isCover: index === 0,
      isPublished: true,
      isHidden: false,
    })),
  });
}

export async function syncProductToContentItem(
  input: SyncProductToContentItemInput,
): Promise<SyncProductToContentItemResult> {
  const canonicalSlug = input.canonicalSlug.trim();
  if (!canonicalSlug) {
    throw new Error("canonicalSlug is required");
  }

  const contentTypeId = await ensureProductsContentTypeId();
  const product = normalizeProductPayload(input.product, canonicalSlug);
  const attributes = mapProductToContentAttributes(product);
  const metadata = buildProductMigrationMetadata(
    input.legacyProductId ?? String(product.id ?? canonicalSlug),
    canonicalSlug,
    input.collectionSlugs,
  );
  const status = input.status ?? mapProductStatusToContentStatus("published");

  const existingBySlug = await prisma.contentItem.findFirst({
    where: {
      contentTypeId,
      slug: canonicalSlug,
      deletedAt: null,
    },
    include: {
      contentType: true,
      collection: true,
    },
  });

  let existing = existingBySlug;
  if (!existing && input.legacyProductId) {
    const siblings = await prisma.contentItem.findMany({
      where: { contentTypeId, deletedAt: null },
      select: { id: true, metadata: true },
    });
    const { parseProductContentItemMetadata } = await import(
      "@/features/entities/migration/metadata"
    );
    const match = siblings.find(
      (row) =>
        parseProductContentItemMetadata(row.metadata).migration?.legacyProductId ===
        input.legacyProductId,
    );
    if (match) {
      existing = await prisma.contentItem.findFirst({
        where: { id: match.id, deletedAt: null },
        include: { contentType: true, collection: true },
      });
    }
  }

  const featuredImageUrl = product.media?.images?.[0]?.url ?? null;

  const row = existing
    ? await prisma.contentItem.update({
        where: { id: existing.id },
        data: {
          slug: canonicalSlug,
          attributes: attributes as Prisma.InputJsonValue,
          metadata: metadata as Prisma.InputJsonValue,
          status,
          isVisible: status === "PUBLISHED",
          featuredImageUrl,
        },
        include: {
          contentType: true,
          collection: true,
        },
      })
    : await prisma.contentItem.create({
        data: {
          contentTypeId,
          slug: canonicalSlug,
          attributes: attributes as Prisma.InputJsonValue,
          blocks: [],
          displaySettings: {},
          metadata: metadata as Prisma.InputJsonValue,
          status,
          isFeatured: false,
          isVisible: status === "PUBLISHED",
          sortOrder: 0,
          featuredImageUrl,
        },
        include: {
          contentType: true,
          collection: true,
        },
      });

  const legacyId = input.legacyProductId;
  if (legacyId) {
    await copyProductTranslationsToContentItem(legacyId, row.id);
  } else if (input.localeCode) {
    const title =
      product.productTitle?.trim() ||
      product.name?.trim() ||
      product.title?.trim() ||
      canonicalSlug;
    await translationService.upsertMany([
      {
        entityType: "ContentItem",
        entityId: row.id,
        field: "title",
        localeCode: input.localeCode.toLowerCase(),
        value: title,
        status: "PUBLISHED",
      },
    ]);
  }

  if (input.localeCode) {
    await upsertProductSlugTranslation(
      row.id,
      input.localeCode,
      input.localizedSlug ?? canonicalSlug,
    );
  }

  await syncProductMedia(row.id, product);

  const indexed = await prisma.contentItem.findUniqueOrThrow({
    where: { id: row.id },
    include: { contentType: true, collection: true },
  });

  await searchIndexer.indexContentItem({
    id: indexed.id,
    slug: indexed.slug,
    attributes: indexed.attributes,
    metadata: indexed.metadata,
    blocks: indexed.blocks,
    status: indexed.status,
    isVisible: indexed.isVisible,
    contentType: indexed.contentType,
    collection: indexed.collection
      ? { id: indexed.collection.id, slug: indexed.collection.slug }
      : null,
  });

  return { contentItemId: indexed.id, created: !existing };
}
