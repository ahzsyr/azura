import type { SearchEntityType } from "@prisma/client";
import {
  normalizeEntityTypes,
  normalizeFacetFilters,
  normalizeSearchQuery,
} from "@/capabilities/search/query/normalize-search-query";

export type SearchFilterKeyInput = {
  types?: SearchEntityType[] | string[];
  facets?: Record<string, string[]>;
  locale: string;
  apiBase?: string;
};

export type SearchQueryKeyInput = SearchFilterKeyInput & {
  q: string;
  offset?: number;
  limit?: number;
};

const ROOT = ["search"] as const;

export function searchFilterKey(input: SearchFilterKeyInput) {
  return [
    ...ROOT,
    "filters",
    input.apiBase ?? "/api/search",
    input.locale,
    normalizeEntityTypes(input.types as string[] | undefined),
    normalizeFacetFilters(input.facets),
  ] as const;
}

export function searchDiscoveryKey(apiBase: string, locale: string) {
  return [...ROOT, "discovery", apiBase, locale] as const;
}

export function searchAutocompleteKey(input: SearchQueryKeyInput) {
  return [
    ...ROOT,
    "autocomplete",
    input.apiBase ?? "/api/search",
    input.locale,
    normalizeSearchQuery(input.q),
    ...searchFilterKey(input).slice(3),
  ] as const;
}

export function searchResultsKey(input: SearchQueryKeyInput) {
  return [
    ...ROOT,
    "results",
    input.apiBase ?? "/api/search",
    input.locale,
    normalizeSearchQuery(input.q),
    input.offset ?? 0,
    input.limit ?? 20,
    ...searchFilterKey(input).slice(3),
  ] as const;
}

export function searchFacetsKey(input: SearchQueryKeyInput) {
  return [
    ...ROOT,
    "facets",
    input.apiBase ?? "/api/search",
    input.locale,
    normalizeSearchQuery(input.q),
    ...searchFilterKey(input).slice(3),
  ] as const;
}

export function searchTrendingKey(apiBase: string, locale: string) {
  return [...ROOT, "trending", apiBase, locale] as const;
}
