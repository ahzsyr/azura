import {
  parseProductListingFilterSettings,
  type ProductListingFilterSettings,
} from "@/features/products/listing/product-listing-filters.schema";

/**
 * Resolved admin configuration for product listing filter sections.
 * Does not inspect facet data — only what the administrator requested.
 */
export type ResolvedProductListingFilters = ProductListingFilterSettings;

export function resolveProductListingFilters(
  raw: unknown,
): ResolvedProductListingFilters {
  return parseProductListingFilterSettings(raw);
}

/** Resolve from a full site-settings payload. */
export function resolveProductListingFiltersFromSite(
  siteSettings: Record<string, unknown> | null | undefined,
): ResolvedProductListingFilters {
  return resolveProductListingFilters(siteSettings?.productListingFilters);
}
