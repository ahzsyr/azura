import { countActiveFilters, filterStateFromSearchParams } from "@/features/products/listing/url-state";

/**
 * Public listing query keys (nuqs urlKeys + common extras).
 * Faceted combinations must not be priority-indexable or sitemap entries.
 */
export const FACET_FILTER_QUERY_KEYS = [
  "q",
  "q_exact",
  "category",
  "brand",
  "collection",
  "scope",
  "tag",
  "condition",
  "var",
  "price_min",
  "price_max",
  "stock",
  "rules",
  "page",
  "per",
  "logic",
  "sort",
  "view",
] as const;

export type FacetIndexabilityVerdict = {
  url: string;
  isFacetFiltered: boolean;
  /** Priority indexable = clean category/brand/product listing without facet params. */
  isPriorityIndexable: boolean;
  reason: string;
  activeFilterCount: number;
};

function parseUrlLike(raw: string): { pathname: string; searchParams: URLSearchParams } {
  const trimmed = raw.trim();
  try {
    if (/^https?:\/\//i.test(trimmed)) {
      const u = new URL(trimmed);
      return { pathname: u.pathname, searchParams: u.searchParams };
    }
  } catch {
    // fall through
  }
  const qIndex = trimmed.indexOf("?");
  if (qIndex >= 0) {
    return {
      pathname: trimmed.slice(0, qIndex) || "/",
      searchParams: new URLSearchParams(trimmed.slice(qIndex + 1)),
    };
  }
  return { pathname: trimmed || "/", searchParams: new URLSearchParams() };
}

function hasKnownFacetKey(searchParams: URLSearchParams): boolean {
  for (const key of FACET_FILTER_QUERY_KEYS) {
    if (!searchParams.has(key)) continue;
    const value = searchParams.get(key);
    if (key === "page" && (value === "1" || value === null || value === "")) continue;
    if (key === "per" && (!value || value === "20")) continue;
    if (value != null && value !== "") return true;
    // multi-value keys
    if (searchParams.getAll(key).some((v) => v.trim())) return true;
  }
  return false;
}

/** True when the URL carries listing facet/filter state beyond the clean landing page. */
export function hasFacetFilterParams(searchParams: URLSearchParams): boolean {
  if (hasKnownFacetKey(searchParams)) return true;
  const state = filterStateFromSearchParams(searchParams);
  // page>1 alone is pagination — not a unique intent landing page
  if (state.page > 1) return true;
  return countActiveFilters(state) > 0;
}

/**
 * Evaluate whether a listing URL should be priority-indexable.
 * Faceted/filter combinations → not priority indexable (canonical should point at clean path).
 */
export function evaluateFacetUrlIndexability(url: string): FacetIndexabilityVerdict {
  const { pathname, searchParams } = parseUrlLike(url);
  const isListingPath =
    /\/(categories|brands|tags|products|collections)(\/|$)/i.test(pathname) ||
    pathname === "/products" ||
    pathname.endsWith("/products");

  if (!isListingPath) {
    return {
      url,
      isFacetFiltered: false,
      isPriorityIndexable: true,
      reason: "Not a catalog listing path — facet policy does not apply",
      activeFilterCount: 0,
    };
  }

  const state = filterStateFromSearchParams(searchParams);
  const activeFilterCount = countActiveFilters(state);
  const isFacetFiltered = hasFacetFilterParams(searchParams);

  if (isFacetFiltered) {
    return {
      url,
      isFacetFiltered: true,
      isPriorityIndexable: false,
      reason:
        "Filter/facet URL must not be priority-indexable; use noindex or canonical-to-clean category",
      activeFilterCount: activeFilterCount + (state.page > 1 ? 1 : 0),
    };
  }

  return {
    url,
    isFacetFiltered: false,
    isPriorityIndexable: true,
    reason: "Clean listing URL is eligible for priority indexing / sitemap",
    activeFilterCount: 0,
  };
}

/** Quality check used by readiness checklist and tests. */
export function assertFilterUrlNotPriorityIndexable(url: string): FacetIndexabilityVerdict {
  const verdict = evaluateFacetUrlIndexability(url);
  if (verdict.isFacetFiltered && verdict.isPriorityIndexable) {
    throw new Error(`Facet URL incorrectly marked priority-indexable: ${url}`);
  }
  return verdict;
}
