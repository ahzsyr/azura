"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import type { SearchEntityType } from "@prisma/client";
import {
  fetchSearchAutocomplete,
  fetchSearchDiscovery,
  fetchSearchFacets,
  fetchSearchResults,
} from "@/capabilities/search/query/search-api-client";
import {
  searchAutocompleteKey,
  searchDiscoveryKey,
  searchFacetsKey,
  searchResultsKey,
} from "@/capabilities/search/query/search-query-keys";
import { SEARCH_GC_TIMES, SEARCH_STALE_TIMES } from "@/capabilities/search/query/search-stale-times";
import {
  markSearchPaintEnd,
  markSearchPaintStart,
  recordSearchMetric,
} from "@/capabilities/search/query/search-performance-metrics";
import type { SearchLatencySurface } from "@/capabilities/search/query/search-feature-flags";

type BaseInput = {
  apiBase?: string;
  locale: string;
  types?: SearchEntityType[];
  facets?: Record<string, string[]>;
  surface?: SearchLatencySurface;
};

export function useSearchDiscoveryQuery(
  discoveryUrl: string,
  locale: string,
  apiBase = "/api/search",
  surface: SearchLatencySurface = "unknown" as SearchLatencySurface,
  enabled = true
) {
  return useQuery({
    queryKey: searchDiscoveryKey(apiBase, locale),
    queryFn: async ({ signal }) => {
      recordSearchMetric("request_start", { surface, endpoint: "discovery" });
      const data = await fetchSearchDiscovery(discoveryUrl, signal);
      recordSearchMetric("request_end", { surface, endpoint: "discovery" });
      return data;
    },
    enabled,
    staleTime: SEARCH_STALE_TIMES.discovery,
    gcTime: SEARCH_GC_TIMES.discovery,
    structuralSharing: true,
  });
}

export type SearchAutocompleteQueryInput = BaseInput & {
  q: string;
  enabled?: boolean;
};

export function useSearchAutocompleteQuery(input: SearchAutocompleteQueryInput) {
  const apiBase = input.apiBase ?? "/api/search";
  const surface = input.surface ?? "unknown";
  const paintKey = `autocomplete:${input.locale}:${input.q}`;

  return useQuery({
    queryKey: searchAutocompleteKey({
      apiBase,
      locale: input.locale,
      q: input.q,
      types: input.types,
      facets: input.facets,
    }),
    queryFn: async ({ signal }) => {
      recordSearchMetric("request_start", {
        surface,
        endpoint: "autocomplete",
        normalizedQuery: input.q,
      });
      markSearchPaintStart(paintKey);
      const data = await fetchSearchAutocomplete(
        {
          apiBase,
          locale: input.locale,
          q: input.q,
          types: input.types,
          facets: input.facets,
        },
        signal
      );
      recordSearchMetric("request_end", {
        surface,
        endpoint: "autocomplete",
        normalizedQuery: input.q,
      });
      markSearchPaintEnd(paintKey, {
        surface,
        endpoint: "autocomplete",
        normalizedQuery: input.q,
        budgetMetric: "autocompleteVisible",
      });
      return data;
    },
    enabled: input.enabled !== false,
    staleTime: SEARCH_STALE_TIMES.autocomplete,
    gcTime: SEARCH_GC_TIMES.autocomplete,
    placeholderData: keepPreviousData,
    structuralSharing: true,
  });
}

export type SearchResultsQueryInput = BaseInput & {
  q: string;
  limit: number;
  offset?: number;
  enabled?: boolean;
};

export function useSearchResultsQuery(input: SearchResultsQueryInput) {
  const apiBase = input.apiBase ?? "/api/search";
  const surface = input.surface ?? "unknown";
  const offset = input.offset ?? 0;
  const paintKey = `search:${input.locale}:${input.q}:${offset}`;

  return useQuery({
    queryKey: searchResultsKey({
      apiBase,
      locale: input.locale,
      q: input.q,
      types: input.types,
      facets: input.facets,
      limit: input.limit,
      offset,
    }),
    queryFn: async ({ signal }) => {
      recordSearchMetric("request_start", {
        surface,
        endpoint: "search",
        normalizedQuery: input.q,
      });
      markSearchPaintStart(paintKey);
      const data = await fetchSearchResults(
        {
          apiBase,
          locale: input.locale,
          q: input.q,
          types: input.types,
          facets: input.facets,
          limit: input.limit,
          offset,
        },
        signal
      );
      recordSearchMetric("request_end", {
        surface,
        endpoint: "search",
        normalizedQuery: input.q,
      });
      markSearchPaintEnd(paintKey, {
        surface,
        endpoint: "search",
        normalizedQuery: input.q,
        budgetMetric: "searchResultUpdate",
      });
      return data;
    },
    enabled: input.enabled !== false,
    staleTime: SEARCH_STALE_TIMES.search,
    gcTime: SEARCH_GC_TIMES.search,
    placeholderData: keepPreviousData,
    structuralSharing: true,
  });
}

export type SearchFacetsQueryInput = BaseInput & {
  q: string;
  enabled?: boolean;
};

export function useSearchFacetsQuery(input: SearchFacetsQueryInput) {
  const apiBase = input.apiBase ?? "/api/search";

  return useQuery({
    queryKey: searchFacetsKey({
      apiBase,
      locale: input.locale,
      q: input.q,
      types: input.types,
      facets: input.facets,
    }),
    queryFn: ({ signal }) =>
      fetchSearchFacets(
        {
          apiBase,
          locale: input.locale,
          q: input.q,
          types: input.types,
          facets: input.facets,
        },
        signal
      ),
    enabled: input.enabled !== false,
    staleTime: SEARCH_STALE_TIMES.facets,
    gcTime: SEARCH_GC_TIMES.facets,
    placeholderData: keepPreviousData,
    structuralSharing: true,
  });
}
