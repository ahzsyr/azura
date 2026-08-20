/** Perceived-latency targets for search surfaces (ms unless noted). */
export const SEARCH_PERF_BUDGETS = {
  autocompleteVisible: 100,
  searchResultUpdate: 200,
  cachedRender: 16,
  modalOpenInteractive: 50,
} as const;

export type SearchPerfMetric =
  | "autocompleteVisible"
  | "searchResultUpdate"
  | "cachedRender"
  | "modalOpenInteractive";

export function isWithinSearchBudget(
  metric: SearchPerfMetric,
  durationMs: number
): boolean {
  return durationMs <= SEARCH_PERF_BUDGETS[metric];
}
