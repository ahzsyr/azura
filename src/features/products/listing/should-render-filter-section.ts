import type { ListingFacets } from "@/features/products/listing/types";
import type { ProductListingFilterSectionId } from "@/features/products/listing/product-listing-filter-keys";
import type { ResolvedProductListingFilters } from "@/features/products/listing/resolve-product-listing-filters";

export type ShouldRenderFilterSectionContext = {
  visibility: ResolvedProductListingFilters["visibility"];
  facets: ListingFacets;
  /** True when at least one variation type has options. */
  hasSpecificationOptions: boolean;
};

/**
 * Runtime eligibility for a product listing filter section.
 * Combines admin visibility with empty-option rules.
 * Does not live in the resolver — facet inspection stays here.
 */
export function shouldRenderSection(
  id: ProductListingFilterSectionId,
  ctx: ShouldRenderFilterSectionContext,
): boolean {
  if (!ctx.visibility[id]) return false;

  switch (id) {
    case "price":
    case "availability":
      return true;
    case "category":
      return ctx.facets.categories.length > 0;
    case "brand":
      return ctx.facets.brands.length > 0;
    case "tags":
      return ctx.facets.tags.length > 0;
    case "condition":
      return ctx.facets.conditions.length > 0;
    case "specifications":
      return ctx.hasSpecificationOptions;
    default: {
      const _exhaustive: never = id;
      return _exhaustive;
    }
  }
}
