import type { ListingFilterLogic, ListingFilterState } from "./types";
import { normalizeListingFilterState, normalizeSearchQuery } from "./normalize";
import { countActiveFilters } from "./url-state";

export type ListingQueryStrategy = "scan" | "inverted" | "hybrid" | "search";

export type ListingFilterQueryPlan = {
  state: ListingFilterState;
  query: {
    normalized: string;
    tokens: string[];
  };
  facets: {
    categories: string[];
    brands: string[];
    collections: string[];
    tags: string[];
    conditions: string[];
    variations: Record<string, string[]>;
  };
  scope: {
    collection: string | null;
  };
  range: {
    priceMin: number | null;
    priceMax: number | null;
  };
  stockOnly: boolean;
  logic: ListingFilterLogic;
  candidateStrategy: ListingQueryStrategy;
  capabilities: {
    canUseInvertedIndex: boolean;
    canUseSearchIndex: boolean;
    canUseRangeIndex: boolean;
    canUseScopeIndex: boolean;
  };
  estimatedSelectivity?: number;
};

function hasFacetSelections(state: ListingFilterState): boolean {
  if (state.categories.length > 0) return true;
  if (state.brands.length > 0) return true;
  if (state.collections.length > 0) return true;
  if (state.tags.length > 0) return true;
  if (state.conditions.length > 0) return true;
  for (const opts of Object.values(state.variations)) {
    if (opts.length > 0) return true;
  }
  return false;
}

function resolveStrategy(state: ListingFilterState): ListingQueryStrategy {
  const hasQ = state.q.trim().length > 0;
  const hasFacets = hasFacetSelections(state) || state.stockOnly;
  const hasScope = Boolean(state.collectionScope?.trim());
  const hasPrice = state.priceMin != null || state.priceMax != null;

  if (hasQ && (hasFacets || hasScope || hasPrice)) return "hybrid";
  if (hasQ) return "search";
  if (hasFacets || hasScope || hasPrice || state.stockOnly) return "inverted";
  return "scan";
}

/**
 * Build a declarative query plan from filter state.
 * Does not execute indexes — only describes what the engine should do.
 */
export function createListingQueryPlan(
  input: ListingFilterState,
  options?: { preferScan?: boolean },
): ListingFilterQueryPlan {
  const state = normalizeListingFilterState(input);
  const query = normalizeSearchQuery(state.q);
  const strategy = options?.preferScan ? "scan" : resolveStrategy(state);
  const active = countActiveFilters(state);

  return {
    state,
    query,
    facets: {
      categories: state.categories,
      brands: state.brands,
      collections: state.collections,
      tags: state.tags,
      conditions: state.conditions,
      variations: state.variations,
    },
    scope: {
      collection: state.collectionScope,
    },
    range: {
      priceMin: state.priceMin,
      priceMax: state.priceMax,
    },
    stockOnly: state.stockOnly,
    logic: state.logic === "or" ? "or" : "and",
    candidateStrategy: strategy,
    capabilities: {
      canUseInvertedIndex: hasFacetSelections(state) || state.stockOnly,
      canUseSearchIndex: query.normalized.length > 0,
      canUseRangeIndex: state.priceMin != null || state.priceMax != null,
      canUseScopeIndex: Boolean(state.collectionScope),
    },
    estimatedSelectivity: active === 0 ? 1 : undefined,
  };
}
