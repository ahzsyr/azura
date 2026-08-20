import type { ListingFilterState } from "@/features/products/listing/types";
import { filtersToListingState } from "./filters-to-listing-state";
import {
  inferCatalogNavigationActionType,
  type CatalogNavigationItem,
  type CatalogNavigationItemFilters,
} from "./types";

export type ListingStateMatchContext = {
  /**
   * Path-implied brand display name (e.g. brand detail page). Treated as if
   * `brands` already contained this value when matching brand filter items.
   */
  pathBrandName?: string | null;
  /**
   * Path-implied category facet name (when category detail exposes category name).
   * Distinct from collectionScope slug.
   */
  pathCategoryName?: string | null;
  /** Path collection scope slug (category detail membership scope). */
  pathCollectionScope?: string | null;
};

function sortedCopy(values: string[]): string[] {
  return [...values].map((v) => v.trim()).filter(Boolean).sort((a, b) => a.localeCompare(b));
}

function arraysEqualAsSets(a: string[], b: string[]): boolean {
  const aa = sortedCopy(a);
  const bb = sortedCopy(b);
  if (aa.length !== bb.length) return false;
  return aa.every((v, i) => v === bb[i]);
}

function variationsEqual(
  a: Record<string, string[]>,
  b: Record<string, string[]>,
): boolean {
  const keysA = Object.keys(a).sort();
  const keysB = Object.keys(b).sort();
  if (keysA.length !== keysB.length) return false;
  for (const key of keysA) {
    if (!arraysEqualAsSets(a[key] ?? [], b[key] ?? [])) return false;
  }
  return true;
}

function effectiveState(
  state: ListingFilterState,
  ctx?: ListingStateMatchContext,
): ListingFilterState {
  const brands = [...state.brands];
  const categories = [...state.categories];
  if (ctx?.pathBrandName?.trim() && !brands.includes(ctx.pathBrandName.trim())) {
    brands.push(ctx.pathBrandName.trim());
  }
  if (ctx?.pathCategoryName?.trim() && !categories.includes(ctx.pathCategoryName.trim())) {
    categories.push(ctx.pathCategoryName.trim());
  }
  return {
    ...state,
    brands,
    categories,
    collectionScope: state.collectionScope ?? ctx?.pathCollectionScope ?? null,
  };
}

/**
 * True when current listing state satisfies the navigation item's configured filters.
 * For PAGE_LINK / CUSTOM_URL items, returns false (pathname active is handled separately).
 *
 * Match semantics: every non-empty dimension in the item's compiled filter must be
 * present in the current state (exact set equality per dimension the item configures).
 * Extra filters in the current URL do not prevent a match (nav item is a subset).
 * For MULTI with ALL, all dimensions must match; for ANY, at least one configured
 * dimension must fully match.
 */
export function listingStateMatchesFilters(
  state: ListingFilterState,
  filters: CatalogNavigationItemFilters | null | undefined,
  ctx?: ListingStateMatchContext,
): boolean {
  if (!filters) return false;
  const required = filtersToListingState(filters);
  const hasRequired =
    (required.categories?.length ?? 0) > 0 ||
    (required.brands?.length ?? 0) > 0 ||
    (required.tags?.length ?? 0) > 0 ||
    (required.conditions?.length ?? 0) > 0 ||
    (required.collections?.length ?? 0) > 0 ||
    (required.variations && Object.keys(required.variations).length > 0) ||
    required.priceMin != null ||
    required.priceMax != null ||
    required.stockOnly === true;
  if (!hasRequired) return false;

  const current = effectiveState(state, ctx);
  const matchAny = required.logic === "or";

  const checks: boolean[] = [];

  if (required.categories?.length) {
    checks.push(required.categories.every((c) => current.categories.includes(c)));
  }
  if (required.brands?.length) {
    checks.push(required.brands.every((b) => current.brands.includes(b)));
  }
  if (required.tags?.length) {
    checks.push(required.tags.every((t) => current.tags.includes(t)));
  }
  if (required.conditions?.length) {
    checks.push(required.conditions.every((c) => current.conditions.includes(c)));
  }
  if (required.collections?.length) {
    checks.push(required.collections.every((c) => current.collections.includes(c)));
  }
  if (required.variations && Object.keys(required.variations).length) {
    const ok = Object.entries(required.variations).every(([type, opts]) => {
      const have = current.variations[type] ?? [];
      return opts.every((o) => have.includes(o));
    });
    checks.push(ok);
  }
  if (required.stockOnly) {
    checks.push(current.stockOnly === true);
  }

  if (checks.length === 0) return false;
  return matchAny ? checks.some(Boolean) : checks.every(Boolean);
}

export function catalogNavItemIsFilterActive(
  item: CatalogNavigationItem,
  state: ListingFilterState,
  ctx?: ListingStateMatchContext,
): boolean {
  const action = inferCatalogNavigationActionType(item);
  if (action === "SEARCH") {
    const keyword = item.searchQuery?.trim() ?? "";
    if (!keyword) return false;
    const qMatches = state.q.trim().toLowerCase() === keyword.toLowerCase();
    const exactMatches = item.searchExact === true ? state.qExact === true : state.qExact !== true;
    return qMatches && exactMatches;
  }
  if (
    action !== "CATEGORY_FILTER" &&
    action !== "BRAND_FILTER" &&
    action !== "ATTRIBUTE_FILTER" &&
    action !== "SPEC_FILTER" &&
    action !== "MULTI_FILTER"
  ) {
    return false;
  }
  return listingStateMatchesFilters(state, item.filters, ctx);
}

/** Exact equality helper for tests / strict active (all configured dims equal). */
export function listingStatesEqualForNav(
  a: Partial<ListingFilterState>,
  b: Partial<ListingFilterState>,
): boolean {
  if (!arraysEqualAsSets(a.categories ?? [], b.categories ?? [])) return false;
  if (!arraysEqualAsSets(a.brands ?? [], b.brands ?? [])) return false;
  if (!arraysEqualAsSets(a.tags ?? [], b.tags ?? [])) return false;
  if (!arraysEqualAsSets(a.conditions ?? [], b.conditions ?? [])) return false;
  if (!arraysEqualAsSets(a.collections ?? [], b.collections ?? [])) return false;
  if (!variationsEqual(a.variations ?? {}, b.variations ?? {})) return false;
  const logicA = a.logic === "or" ? "or" : "and";
  const logicB = b.logic === "or" ? "or" : "and";
  return logicA === logicB;
}
