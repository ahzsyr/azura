/** Data-type-specific stale times (ms) for TanStack Query. */
export const SEARCH_STALE_TIMES = {
  autocomplete: 30_000,
  search: 30_000,
  facets: 120_000,
  discovery: 15 * 60_000,
  configuration: 60 * 60_000,
  trending: 5 * 60_000,
} as const;

export const SEARCH_GC_TIMES = {
  autocomplete: 10 * 60_000,
  search: 10 * 60_000,
  facets: 15 * 60_000,
  discovery: 30 * 60_000,
  trending: 15 * 60_000,
} as const;
