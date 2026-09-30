"use client";

import { useMemo } from "react";
import type { SearchEntityType } from "@prisma/client";
import { applyRecentlyViewedBoost } from "@/capabilities/personalization/signals/recently-viewed";
import type { SearchResultHit } from "@/capabilities/search/components/discovery/search-result-card-router";
import type { FacetAggregation } from "@/capabilities/search/engine/filter/search-facet-engine";
import { useDebouncedValue } from "@/capabilities/search/query/use-debounced-value";
import {
  useSearchFacetsQuery,
  useSearchResultsQuery,
} from "@/capabilities/search/query/use-search-queries";
import { isSearchLatencyEnabledForSurface } from "@/capabilities/search/query/search-feature-flags";
import { useSearchPrefetch } from "@/capabilities/search/query/use-search-prefetch";
import {
  useSearchCacheHitMetrics,
  useSearchDedupMetrics,
} from "@/capabilities/search/query/use-search-dedup-metrics";
import { searchFacetsKey, searchResultsKey } from "@/capabilities/search/query/search-query-keys";

type PaginationMeta = {
  offset: number;
  limit: number;
  hasMore: boolean;
  total: number;
};

type SearchSection = {
  entityType: SearchEntityType;
  label: string;
  count: number;
};

export type UseSearchPageDataInput = {
  locale: string;
  query: string;
  urlQuery: string;
  minQueryLength: number;
  resultsPerPage: number;
  instantSearch: boolean;
  debounceMs: number;
  activeTypes: SearchEntityType[];
  activeFacetFilters: Record<string, string[]>;
  enabled?: boolean;
};

export function useSearchPageData(input: UseSearchPageDataInput) {
  const useQueryLayer = isSearchLatencyEnabledForSurface("page");
  const debouncedQuery = useDebouncedValue(input.query, input.debounceMs);

  const effectiveQuery = input.instantSearch ? debouncedQuery : input.urlQuery;
  const meetsMinLength = effectiveQuery.length >= input.minQueryLength;

  const resultsQuery = useSearchResultsQuery({
    apiBase: "/api/search",
    locale: input.locale,
    q: effectiveQuery,
    types: input.activeTypes,
    facets: input.activeFacetFilters,
    limit: input.resultsPerPage,
    offset: 0,
    enabled: useQueryLayer && input.enabled !== false && meetsMinLength,
    surface: "page",
  });

  const facetsQuery = useSearchFacetsQuery({
    apiBase: "/api/search",
    locale: input.locale,
    q: effectiveQuery,
    types: input.activeTypes,
    facets: input.activeFacetFilters,
    enabled: useQueryLayer && input.enabled !== false && meetsMinLength,
    surface: "page",
  });

  useSearchPrefetch({
    surface: "page",
    locale: input.locale,
    apiBase: "/api/search",
    q: effectiveQuery,
    types: input.activeTypes,
    facets: input.activeFacetFilters,
    relatedTerms: resultsQuery.data?.relatedTerms,
    enabled: useQueryLayer && meetsMinLength,
    limit: input.resultsPerPage,
  });

  useSearchDedupMetrics(
    searchResultsKey({
      apiBase: "/api/search",
      locale: input.locale,
      q: effectiveQuery,
      types: input.activeTypes,
      facets: input.activeFacetFilters,
      limit: input.resultsPerPage,
      offset: 0,
    }),
    "page",
    "search"
  );

  useSearchDedupMetrics(
    searchFacetsKey({
      apiBase: "/api/search",
      locale: input.locale,
      q: effectiveQuery,
      types: input.activeTypes,
      facets: input.activeFacetFilters,
    }),
    "page",
    "facets"
  );

  useSearchCacheHitMetrics(
    resultsQuery.isFetching,
    resultsQuery.isFetched,
    "page",
    "search",
    effectiveQuery
  );

  const results = useMemo(() => {
    if (!useQueryLayer || !resultsQuery.data) return [] as SearchResultHit[];
    return applyRecentlyViewedBoost(
      (resultsQuery.data.results ?? []) as SearchResultHit[],
      input.locale
    );
  }, [useQueryLayer, resultsQuery.data, input.locale]);

  const sections = (resultsQuery.data?.sections ?? []) as SearchSection[];
  const relatedTerms = resultsQuery.data?.relatedTerms ?? [];
  const expandedQuery = resultsQuery.data?.expandedQuery ?? null;
  const facetAggregations = (facetsQuery.data?.facets ?? []) as FacetAggregation[];
  const pagination = (resultsQuery.data?.pagination ?? null) as PaginationMeta | null;

  const loading =
    useQueryLayer && meetsMinLength
      ? resultsQuery.isFetching && !resultsQuery.isPlaceholderData
      : false;

  const isFetching =
    useQueryLayer && meetsMinLength ? resultsQuery.isFetching || facetsQuery.isFetching : false;

  return {
    useQueryLayer,
    effectiveQuery,
    meetsMinLength,
    results,
    sections,
    relatedTerms,
    expandedQuery,
    facetAggregations,
    pagination,
    loading,
    isFetching,
    resultsQuery,
    facetsQuery,
  };
}

export async function fetchSearchPageLegacy(
  params: {
    q: string;
    locale: string;
    limit: number;
    offset: number;
    typesQuery: string;
    facetsQuery: string;
  },
  signal?: AbortSignal
) {
  const res = await fetch(
    `/api/search?q=${encodeURIComponent(params.q)}&locale=${params.locale}&limit=${params.limit}&offset=${params.offset}${params.typesQuery}${params.facetsQuery}`,
    { signal }
  );
  if (!res.ok) throw new Error("Search failed");
  return res.json();
}

export async function fetchSearchFacetsLegacy(
  params: {
    q: string;
    locale: string;
    typesQuery: string;
    facetsQuery: string;
  },
  signal?: AbortSignal
) {
  const res = await fetch(
    `/api/search/facets?q=${encodeURIComponent(params.q)}&locale=${params.locale}${params.typesQuery}${params.facetsQuery}`,
    { signal }
  );
  if (!res.ok) throw new Error("Facets failed");
  return res.json();
}
