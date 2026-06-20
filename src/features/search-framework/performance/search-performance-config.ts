import type { SearchPerformanceSettings } from "@/features/search/settings/admin-search-settings.schema";
import { SEARCH_PERF_LIMITS } from "@/features/search-framework/performance/search-performance-limits";

export type ResolvedSearchPerformanceConfig = {
  syncCatalogOnProductIndex: boolean;
  mediaIndexLimit: number;
  maxRetrievalCandidates: number;
  indexBodyMaxChars: number;
  queryCacheEnabled: boolean;
  queryCacheTtlSec: number;
  indexConcurrency: number;
};

const DEFAULT: ResolvedSearchPerformanceConfig = {
  syncCatalogOnProductIndex: true,
  mediaIndexLimit: 500,
  maxRetrievalCandidates: SEARCH_PERF_LIMITS.maxRetrievalCandidates,
  indexBodyMaxChars: SEARCH_PERF_LIMITS.maxIndexBodyChars,
  queryCacheEnabled: true,
  queryCacheTtlSec: SEARCH_PERF_LIMITS.defaultQueryCacheTtlSec,
  indexConcurrency: SEARCH_PERF_LIMITS.indexConcurrency,
};

let cached: ResolvedSearchPerformanceConfig | null = null;

export function resolveSearchPerformanceConfig(
  perf?: Partial<SearchPerformanceSettings> | null
): ResolvedSearchPerformanceConfig {
  if (!perf) return { ...DEFAULT };
  return {
    syncCatalogOnProductIndex: perf.syncCatalogOnProductIndex !== false,
    mediaIndexLimit:
      typeof perf.mediaIndexLimit === "number"
        ? Math.min(5000, Math.max(0, Math.floor(perf.mediaIndexLimit)))
        : DEFAULT.mediaIndexLimit,
    maxRetrievalCandidates:
      typeof perf.maxRetrievalCandidates === "number"
        ? Math.min(SEARCH_PERF_LIMITS.maxRetrievalCandidates, Math.max(20, perf.maxRetrievalCandidates))
        : DEFAULT.maxRetrievalCandidates,
    indexBodyMaxChars:
      typeof perf.indexBodyMaxChars === "number"
        ? Math.min(24_000, Math.max(2000, perf.indexBodyMaxChars))
        : DEFAULT.indexBodyMaxChars,
    queryCacheEnabled: perf.queryCacheEnabled !== false,
    queryCacheTtlSec:
      typeof perf.queryCacheTtlSec === "number"
        ? Math.min(
            SEARCH_PERF_LIMITS.queryCacheTtlSecMax,
            Math.max(5, Math.floor(perf.queryCacheTtlSec))
          )
        : DEFAULT.queryCacheTtlSec,
    indexConcurrency:
      typeof perf.indexConcurrency === "number"
        ? Math.min(16, Math.max(1, Math.floor(perf.indexConcurrency)))
        : DEFAULT.indexConcurrency,
  };
}

export function setSearchPerformanceConfig(config: ResolvedSearchPerformanceConfig): void {
  cached = config;
}

export function getSearchPerformanceConfig(): Readonly<ResolvedSearchPerformanceConfig> {
  return Object.freeze(cached ? { ...cached } : { ...DEFAULT });
}
