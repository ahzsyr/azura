"use client";

import {
  isWithinSearchBudget,
  SEARCH_PERF_BUDGETS,
  type SearchPerfMetric,
} from "@/capabilities/search/query/search-performance-budgets";

type SearchMetricEvent =
  | "cache_hit"
  | "cache_miss"
  | "dedup_shared"
  | "request_start"
  | "request_end"
  | "paint";

type SearchMetricPayload = {
  surface: "builder" | "page" | "modal" | "unknown";
  endpoint: "autocomplete" | "search" | "facets" | "discovery";
  normalizedQuery?: string;
  durationMs?: number;
  fromCache?: boolean;
  budgetMetric?: SearchPerfMetric;
};

type Counters = {
  cacheHits: number;
  cacheMisses: number;
  dedupShared: number;
  requests: number;
  budgetViolations: number;
};

const counters: Counters = {
  cacheHits: 0,
  cacheMisses: 0,
  dedupShared: 0,
  requests: 0,
  budgetViolations: 0,
};

const paintStarts = new Map<string, number>();

function devLog(event: SearchMetricEvent, payload: SearchMetricPayload): void {
  if (process.env.NODE_ENV !== "development") return;
  if (process.env.NEXT_PUBLIC_SEARCH_PERF_DEBUG !== "1") return;
  console.debug(`[search-perf] ${event}`, payload);
}

export function recordSearchMetric(event: SearchMetricEvent, payload: SearchMetricPayload): void {
  if (event === "cache_hit") counters.cacheHits += 1;
  if (event === "cache_miss") counters.cacheMisses += 1;
  if (event === "dedup_shared") counters.dedupShared += 1;
  if (event === "request_start") counters.requests += 1;

  if (
    event === "paint" &&
    payload.budgetMetric &&
    payload.durationMs != null &&
    !isWithinSearchBudget(payload.budgetMetric, payload.durationMs)
  ) {
    counters.budgetViolations += 1;
  }

  devLog(event, payload);
}

export function markSearchPaintStart(key: string): void {
  paintStarts.set(key, performance.now());
}

export function markSearchPaintEnd(
  key: string,
  payload: Omit<SearchMetricPayload, "durationMs"> & { budgetMetric: SearchPerfMetric }
): number {
  const started = paintStarts.get(key);
  if (started == null) return 0;
  paintStarts.delete(key);
  const durationMs = performance.now() - started;
  recordSearchMetric("paint", { ...payload, durationMs });
  return durationMs;
}

export function getSearchPerfCounters(): Counters & { cacheHitRatio: number } {
  const total = counters.cacheHits + counters.cacheMisses;
  return {
    ...counters,
    cacheHitRatio: total > 0 ? counters.cacheHits / total : 0,
  };
}

export function getSearchPerfBudgets() {
  return SEARCH_PERF_BUDGETS;
}
