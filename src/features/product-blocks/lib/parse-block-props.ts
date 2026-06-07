import type { ProductSelectionConfig } from "@/features/product-blocks/schemas/product-blocks";
import {
  productCarouselPropsSchema,
  productComparisonPropsSchema,
  productFaqPropsSchema,
  productGridPropsSchema,
  productReviewsPropsSchema,
  productSpecificationsPropsSchema,
  relatedProductsPropsSchema,
} from "@/features/product-blocks/schemas/product-blocks";

export function parseProductSelection(raw: Record<string, unknown>): ProductSelectionConfig {
  return {
    source:
      raw.source === "manual" ||
      raw.source === "featured" ||
      raw.source === "tags"
        ? raw.source
        : "collection",
    collectionSlug: String(raw.collectionSlug ?? "").trim(),
    productSlugs: Array.isArray(raw.productSlugs)
      ? raw.productSlugs.filter((s): s is string => typeof s === "string")
      : [],
    tags: Array.isArray(raw.tags)
      ? raw.tags.filter((s): s is string => typeof s === "string")
      : [],
    limit: Number(raw.limit) || 8,
    sortBy:
      raw.sortBy === "name-desc" ||
      raw.sortBy === "price-asc" ||
      raw.sortBy === "price-desc" ||
      raw.sortBy === "newest"
        ? raw.sortBy
        : "name-asc",
  };
}

export function parseProductGridProps(raw: Record<string, unknown>) {
  return productGridPropsSchema.parse({ ...parseProductSelection(raw), ...raw });
}

export function parseProductCarouselProps(raw: Record<string, unknown>) {
  return productCarouselPropsSchema.parse({ ...parseProductSelection(raw), ...raw });
}

export function parseProductComparisonProps(raw: Record<string, unknown>) {
  return productComparisonPropsSchema.parse(raw);
}

export function parseProductSpecificationsProps(raw: Record<string, unknown>) {
  return productSpecificationsPropsSchema.parse(raw);
}

export function parseProductReviewsProps(raw: Record<string, unknown>) {
  return productReviewsPropsSchema.parse(raw);
}

export function parseProductFaqProps(raw: Record<string, unknown>) {
  return productFaqPropsSchema.parse(raw);
}

export function parseRelatedProductsProps(raw: Record<string, unknown>) {
  return relatedProductsPropsSchema.parse(raw);
}
