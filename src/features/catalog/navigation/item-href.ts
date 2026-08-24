import {
  searchParamsFromFilterState,
  filterStateFromSearchParams,
} from "@/features/products/listing/url-state";
import type { ListingFilterState } from "@/features/products/listing/types";
import {
  emptyListingFilterState,
  filtersToListingState,
  mergeListingFilterPartial,
} from "./filters-to-listing-state";
import {
  inferCatalogNavigationActionType,
  type CatalogNavigationItem,
} from "./types";

export type BuildCatalogNavItemHrefInput = {
  locale: string;
  item: CatalogNavigationItem;
  /**
   * Listing base path for filter actions (e.g. `/{locale}/products` or
   * `/{locale}/brands/ubiquiti`). Defaults to `/{locale}/products`.
   */
  listingBasePath?: string;
  /**
   * Existing listing state from the current page URL (path scope already applied
   * by the island). Filter hrefs merge nav filters onto a clean page-1 state
   * without copying path brand/category into query params.
   */
  baseFilterState?: ListingFilterState;
};

function localeProductsPath(locale: string): string {
  return `/${locale}/products`;
}

function pageLinkHref(locale: string, item: CatalogNavigationItem): string {
  if (item.url) return item.url;
  const id = item.targetId?.trim();
  switch (item.targetType) {
    case "CATEGORY":
      return id ? `/${locale}/categories/${id}` : `/${locale}/categories`;
    case "BRAND":
      return id ? `/${locale}/brands/${id}` : `/${locale}/brands`;
    case "PRODUCT":
      return id ? `/${locale}/products/${id}` : `/${locale}/products`;
    case "PAGE":
      return id ? `/${locale}/${id.replace(/^\//, "")}` : `/${locale}`;
    case "URL":
      return item.url || `/${locale}`;
    default:
      return item.url || `/${locale}`;
  }
}

function isFilterAction(action: ReturnType<typeof inferCatalogNavigationActionType>): boolean {
  return (
    action === "CATEGORY_FILTER" ||
    action === "BRAND_FILTER" ||
    action === "ATTRIBUTE_FILTER" ||
    action === "SPEC_FILTER" ||
    action === "MULTI_FILTER" ||
    action === "SEARCH"
  );
}

/**
 * Build the storefront href for a catalog navigation item.
 * Filter actions use existing listing URL encoding (`category`, `brand`, `var`, `logic`, `q`).
 */
export function buildCatalogNavItemHref(input: BuildCatalogNavItemHrefInput): string {
  const { locale, item } = input;
  const action = inferCatalogNavigationActionType(item);

  if (action === "CUSTOM_URL") {
    return item.url || pageLinkHref(locale, item);
  }

  if (action === "PAGE_LINK" || !isFilterAction(action)) {
    return pageLinkHref(locale, item);
  }

  const basePath = input.listingBasePath?.trim() || localeProductsPath(locale);
  const base = emptyListingFilterState();

  if (action === "SEARCH") {
    const q = item.searchQuery?.trim() ?? "";
    const next = mergeListingFilterPartial(base, {
      ...(q ? { q } : {}),
      ...(item.searchExact === true ? { qExact: true } : {}),
    });
    return searchParamsFromFilterState(next, basePath);
  }

  const partial = filtersToListingState(item.filters);
  const next = mergeListingFilterPartial(base, partial);

  return searchParamsFromFilterState(next, basePath);
}

/** Parse listing filter state from a navigation href (for admin URL preview / tests). */
export function listingStateFromNavHref(href: string): ListingFilterState {
  try {
    const url = new URL(href, "https://nav.local");
    return filterStateFromSearchParams(url.searchParams);
  } catch {
    return emptyListingFilterState();
  }
}
