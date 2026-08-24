import { z } from "zod";

/**
 * Admin + storefront listing filter sections.
 * Taxonomy is Category-only after collections→category merge (Stage 7).
 * Legacy saved settings may still contain `"collections"` — dropped on parse.
 */
export const PRODUCT_LISTING_FILTER_SECTION_IDS = [
  "category",
  "brand",
  "tags",
  "specifications",
  "condition",
  "price",
  "availability",
] as const;

export const productListingFilterSectionIdSchema = z.enum(PRODUCT_LISTING_FILTER_SECTION_IDS);
export type ProductListingFilterSectionId = z.infer<typeof productListingFilterSectionIdSchema>;

/** Default display order matching today's ProductListingFilters UI. */
export const DEFAULT_PRODUCT_LISTING_FILTER_DISPLAY_ORDER: ProductListingFilterSectionId[] = [
  "category",
  "brand",
  "tags",
  "price",
  "specifications",
  "condition",
  "availability",
];

export const DEFAULT_PRODUCT_LISTING_FILTER_VISIBILITY: Record<
  ProductListingFilterSectionId,
  boolean
> = {
  category: true,
  brand: true,
  tags: true,
  specifications: true,
  condition: true,
  price: true,
  availability: true,
};

export const PRODUCT_LISTING_FILTER_SECTION_LABELS: Record<ProductListingFilterSectionId, string> = {
  category: "Category",
  brand: "Brand",
  tags: "Tags",
  specifications: "Specifications",
  condition: "Condition",
  price: "Price",
  availability: "Availability",
};

export const PRODUCT_LISTING_FILTER_SECTION_DESCRIPTIONS: Record<
  ProductListingFilterSectionId,
  string
> = {
  category: "Category facet options in the product catalog sidebar.",
  brand: "Brand facet options.",
  tags: "Tag facet options.",
  specifications: "Variation / specification options (size, color, …).",
  condition: "Product condition facet options.",
  price: "Price range filter (min / max).",
  availability: "In-stock / availability toggle.",
};

export function isProductListingFilterSectionId(
  id: string,
): id is ProductListingFilterSectionId {
  return productListingFilterSectionIdSchema.safeParse(id).success;
}

/** Drop unknown/duplicate ids; append any missing known sections in default order. */
export function normalizeProductListingFilterDisplayOrder(
  order: string[] | undefined,
): ProductListingFilterSectionId[] {
  const seen = new Set<ProductListingFilterSectionId>();
  const result: ProductListingFilterSectionId[] = [];
  for (const id of order ?? []) {
    if (!isProductListingFilterSectionId(id) || seen.has(id)) continue;
    seen.add(id);
    result.push(id);
  }
  for (const id of DEFAULT_PRODUCT_LISTING_FILTER_DISPLAY_ORDER) {
    if (!seen.has(id)) result.push(id);
  }
  return result;
}
