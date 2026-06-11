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
import { safeParseProps } from "@/lib/zod/safe-parse-props";

const DEFAULT_PRODUCT_GRID = productGridPropsSchema.parse({});
const DEFAULT_PRODUCT_CAROUSEL = productCarouselPropsSchema.parse({});
const DEFAULT_PRODUCT_COMPARISON = productComparisonPropsSchema.parse({});
const DEFAULT_PRODUCT_SPECIFICATIONS = productSpecificationsPropsSchema.parse({});
const DEFAULT_PRODUCT_REVIEWS = productReviewsPropsSchema.parse({});
const DEFAULT_PRODUCT_FAQ = productFaqPropsSchema.parse({});
const DEFAULT_RELATED_PRODUCTS = relatedProductsPropsSchema.parse({});

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
  return safeParseProps(
    productGridPropsSchema,
    { ...parseProductSelection(raw), ...raw },
    DEFAULT_PRODUCT_GRID,
    "parseProductGridProps",
  );
}

export function parseProductCarouselProps(raw: Record<string, unknown>) {
  return safeParseProps(
    productCarouselPropsSchema,
    { ...parseProductSelection(raw), ...raw },
    DEFAULT_PRODUCT_CAROUSEL,
    "parseProductCarouselProps",
  );
}

export function parseProductComparisonProps(raw: Record<string, unknown>) {
  return safeParseProps(
    productComparisonPropsSchema,
    raw,
    DEFAULT_PRODUCT_COMPARISON,
    "parseProductComparisonProps",
  );
}

export function parseProductSpecificationsProps(raw: Record<string, unknown>) {
  return safeParseProps(
    productSpecificationsPropsSchema,
    raw,
    DEFAULT_PRODUCT_SPECIFICATIONS,
    "parseProductSpecificationsProps",
  );
}

export function parseProductReviewsProps(raw: Record<string, unknown>) {
  return safeParseProps(
    productReviewsPropsSchema,
    raw,
    DEFAULT_PRODUCT_REVIEWS,
    "parseProductReviewsProps",
  );
}

export function parseProductFaqProps(raw: Record<string, unknown>) {
  return safeParseProps(
    productFaqPropsSchema,
    raw,
    DEFAULT_PRODUCT_FAQ,
    "parseProductFaqProps",
  );
}

export function parseRelatedProductsProps(raw: Record<string, unknown>) {
  return safeParseProps(
    relatedProductsPropsSchema,
    raw,
    DEFAULT_RELATED_PRODUCTS,
    "parseRelatedProductsProps",
  );
}
