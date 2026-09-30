"use client";

import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { SearchEntityType } from "@prisma/client";
import { fetchSearchAutocomplete, fetchSearchResults } from "@/capabilities/search/query/search-api-client";
import {
  searchAutocompleteKey,
  searchResultsKey,
} from "@/capabilities/search/query/search-query-keys";
import { SEARCH_STALE_TIMES } from "@/capabilities/search/query/search-stale-times";
import {
  isSearchPrefetchEnabled,
  isSearchLatencyEnabledForSurface,
  type SearchLatencySurface,
} from "@/capabilities/search/query/search-feature-flags";
import { getSearchPerfCounters } from "@/capabilities/search/query/search-performance-metrics";

const MAX_PREFETCH_PER_CYCLE = 3;
const MIN_CACHE_HIT_RATIO_TO_SKIP = 0.8;

type PrefetchInput = {
  surface: SearchLatencySurface;
  locale: string;
  apiBase?: string;
  q: string;
  types?: SearchEntityType[];
  facets?: Record<string, string[]>;
  relatedTerms?: string[];
  suggestionTitles?: string[];
  limit?: number;
  enabled?: boolean;
};

function buildCandidates(input: PrefetchInput): string[] {
  const base = input.q.trim();
  if (!base) return [];
  const candidates = new Set<string>();
  for (const term of input.relatedTerms ?? []) {
    if (term.trim() && term !== base) candidates.add(term.trim());
  }
  for (const title of input.suggestionTitles ?? []) {
    const token = title.trim().split(/\s+/).slice(0, 3).join(" ");
    if (token && token !== base) candidates.add(token);
  }
  return [...candidates].slice(0, MAX_PREFETCH_PER_CYCLE);
}

export function useSearchPrefetch(input: PrefetchInput): void {
  const queryClient = useQueryClient();
  const lastPrefetched = useRef<string>("");

  useEffect(() => {
    if (!input.enabled) return;
    if (!isSearchPrefetchEnabled()) return;
    if (!isSearchLatencyEnabledForSurface(input.surface)) return;

    const { cacheHitRatio } = getSearchPerfCounters();
    if (cacheHitRatio >= MIN_CACHE_HIT_RATIO_TO_SKIP) return;

    const candidates = buildCandidates(input);
    if (!candidates.length) return;

    const cycleKey = `${input.q}:${candidates.join("|")}`;
    if (lastPrefetched.current === cycleKey) return;
    lastPrefetched.current = cycleKey;

    const apiBase = input.apiBase ?? "/api/search";
    const common = {
      apiBase,
      locale: input.locale,
      types: input.types,
      facets: input.facets,
    };

    for (const candidate of candidates) {
      void queryClient.prefetchQuery({
        queryKey: searchAutocompleteKey({ ...common, q: candidate }),
        queryFn: ({ signal }) => fetchSearchAutocomplete({ ...common, q: candidate }, signal),
        staleTime: SEARCH_STALE_TIMES.autocomplete,
      });

      if (input.surface === "page") {
        void queryClient.prefetchQuery({
          queryKey: searchResultsKey({
            ...common,
            q: candidate,
            limit: input.limit ?? 20,
            offset: 0,
          }),
          queryFn: ({ signal }) =>
            fetchSearchResults(
              { ...common, q: candidate, limit: input.limit ?? 20, offset: 0 },
              signal
            ),
          staleTime: SEARCH_STALE_TIMES.search,
        });
      }
    }
  }, [
    input.enabled,
    input.q,
    input.locale,
    input.apiBase,
    input.types,
    input.facets,
    input.relatedTerms,
    input.suggestionTitles,
    input.limit,
    input.surface,
    queryClient,
  ]);
}
