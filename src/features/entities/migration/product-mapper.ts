import type { ContentStatus, Product as DbProduct } from "@prisma/client";
import type { Product } from "@/features/products/types";
import { fromDbRow, extractDenormalizedFields } from "@/features/products/db/product-db-mapper";
import { buildProductMigrationMetadata } from "@/features/entities/migration/metadata";

export function mapProductStatusToContentStatus(status: string | null | undefined): ContentStatus {
  const normalized = (status ?? "published").toLowerCase();
  if (normalized === "draft") return "DRAFT";
  if (normalized === "archived") return "ARCHIVED";
  if (normalized === "scheduled") return "SCHEDULED";
  return "PUBLISHED";
}

export function mapProductToContentAttributes(product: Product): Record<string, unknown> {
  const denorm = extractDenormalizedFields(product);
  return {
    ...product,
    _denorm: denorm,
  };
}

export function mapDbProductRowToContentItemData(row: DbProduct, contentTypeId: string) {
  const product = fromDbRow(row);
  const collectionSlugs = Array.isArray(row.collectionSlugs)
    ? row.collectionSlugs.filter((s): s is string => typeof s === "string")
    : [];

  return {
    contentTypeId,
    slug: row.canonicalSlug,
    attributes: mapProductToContentAttributes(product),
    blocks: [],
    displaySettings: {},
    metadata: buildProductMigrationMetadata(row.id, row.canonicalSlug, collectionSlugs),
    status: mapProductStatusToContentStatus(row.status),
    isFeatured: false,
    isVisible: row.status?.toLowerCase() !== "draft",
    sortOrder: 0,
    featuredImageUrl: product.media?.images?.[0]?.url ?? null,
  };
}

/** Map Product translation fields to ContentItem translation fields. */
export const PRODUCT_TO_CONTENT_TRANSLATION_FIELDS: Record<string, string> = {
  productTitle: "title",
  shortDescription: "excerpt",
  description: "description",
  seoTitle: "seoTitle",
  seoDescription: "seoDescription",
};
