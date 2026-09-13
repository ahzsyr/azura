"use client";

import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { recordSearchMetric } from "@/capabilities/search/query/search-performance-metrics";
import type { SearchLatencySurface } from "@/capabilities/search/query/search-feature-flags";

export function useSearchDedupMetrics(
  queryKey: readonly unknown[],
  surface: SearchLatencySurface,
  endpoint: "autocomplete" | "search" | "facets" | "discovery"
): void {
  const queryClient = useQueryClient();

  useEffect(() => {
    const query = queryClient.getQueryCache().find({ queryKey });
    if (query && query.getObserversCount() > 1) {
      recordSearchMetric("dedup_shared", { surface, endpoint });
    }
  }, [queryClient, queryKey, surface, endpoint]);
}

export function useSearchCacheHitMetrics(
  isFetching: boolean,
  isFetched: boolean,
  surface: SearchLatencySurface,
  endpoint: "autocomplete" | "search" | "facets" | "discovery",
  normalizedQuery?: string
): void {
  useEffect(() => {
    if (isFetched && !isFetching) {
      recordSearchMetric("cache_hit", { surface, endpoint, normalizedQuery });
    }
  }, [isFetched, isFetching, surface, endpoint, normalizedQuery]);
}
