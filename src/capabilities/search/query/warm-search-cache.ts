"use client";

import type { QueryClient } from "@tanstack/react-query";
import { fetchSearchDiscovery } from "@/capabilities/search/query/search-api-client";
import { searchDiscoveryKey } from "@/capabilities/search/query/search-query-keys";
import { SEARCH_STALE_TIMES } from "@/capabilities/search/query/search-stale-times";
import { isSearchWarmCacheEnabled } from "@/capabilities/search/query/search-feature-flags";

export function warmSearchCache(
  queryClient: QueryClient,
  locale: string,
  apiBase = "/api/search"
): void {
  if (!isSearchWarmCacheEnabled()) return;

  const discoveryUrl = `${apiBase}/discovery`;

  void queryClient.prefetchQuery({
    queryKey: searchDiscoveryKey(apiBase, locale),
    queryFn: ({ signal }) => fetchSearchDiscovery(discoveryUrl, signal),
    staleTime: SEARCH_STALE_TIMES.discovery,
  });
}
