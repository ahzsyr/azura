export {
  normalizeSearchQuery,
  normalizeFacetFilters,
  normalizeEntityTypes,
} from "@/capabilities/search/query/normalize-search-query";
export { SEARCH_STALE_TIMES, SEARCH_GC_TIMES } from "@/capabilities/search/query/search-stale-times";
export { SEARCH_PERF_BUDGETS, isWithinSearchBudget } from "@/capabilities/search/query/search-performance-budgets";
export {
  recordSearchMetric,
  markSearchPaintStart,
  markSearchPaintEnd,
  getSearchPerfCounters,
  getSearchPerfBudgets,
} from "@/capabilities/search/query/search-performance-metrics";
export {
  isSearchLatencyEnabled,
  isSearchLatencyEnabledForSurface,
  isSearchPrefetchEnabled,
  isSearchWarmCacheEnabled,
  isSearchVirtualizationEnabled,
  type SearchLatencySurface,
} from "@/capabilities/search/query/search-feature-flags";
export {
  searchAutocompleteKey,
  searchDiscoveryKey,
  searchFacetsKey,
  searchFilterKey,
  searchResultsKey,
  searchTrendingKey,
} from "@/capabilities/search/query/search-query-keys";
export {
  fetchSearchAutocomplete,
  fetchSearchDiscovery,
  fetchSearchFacets,
  fetchSearchResults,
  type SearchApiParams,
  type SearchPageResponse,
} from "@/capabilities/search/query/search-api-client";
export { SearchQueryProvider, getSearchQueryClient } from "@/capabilities/search/query/search-query-provider";
export { SearchQueryShell } from "@/capabilities/search/query/search-query-shell";
export { SearchWarmCacheHost } from "@/capabilities/search/query/search-warm-cache-host";
export { narrowPreviousResults } from "@/capabilities/search/query/incremental-search";
export { useDebouncedValue } from "@/capabilities/search/query/use-debounced-value";
export {
  useSearchDiscoveryQuery,
  useSearchAutocompleteQuery,
  useSearchResultsQuery,
  useSearchFacetsQuery,
} from "@/capabilities/search/query/use-search-queries";
export { warmSearchCache } from "@/capabilities/search/query/warm-search-cache";
export { useSearchPrefetch } from "@/capabilities/search/query/use-search-prefetch";
export {
  useSearchCacheHitMetrics,
  useSearchDedupMetrics,
} from "@/capabilities/search/query/use-search-dedup-metrics";
export {
  buildClientMiniIndex,
  queryClientMiniIndex,
  clearClientMiniIndex,
  getClientMiniIndexSize,
  type ClientMiniIndexRecord,
} from "@/capabilities/search/query/client-mini-index";
