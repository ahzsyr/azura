/** Web Vitals + navigation budgets (post-optimization targets). */
export const PERF_BUDGETS = {
  lcp: { good: 2500, poor: 4000, unit: "ms" as const },
  cls: { good: 0.1, poor: 0.25, unit: "score" as const },
  inp: { good: 200, poor: 500, unit: "ms" as const },
  hydration: { good: 1800, poor: 3500, unit: "ms" as const },
  routeTransition: { good: 400, poor: 1200, unit: "ms" as const },
  routeTransitionP95: { good: 800, poor: 2000, unit: "ms" as const },
  routeFailureRate: { good: 0.01, poor: 0.05, unit: "rate" as const },
  jsChunkGzipKb: { good: 180, poor: 280, unit: "kb" as const },
} as const;

export type VitalRating = "good" | "needs-improvement" | "poor" | "unknown";

export function rateMetric(
  key: keyof typeof PERF_BUDGETS,
  value: number | null | undefined,
): VitalRating {
  if (value == null || Number.isNaN(value)) return "unknown";
  const budget = PERF_BUDGETS[key];
  if (value <= budget.good) return "good";
  if (value <= budget.poor) return "needs-improvement";
  return "poor";
}

export function formatMetricValue(
  key: keyof typeof PERF_BUDGETS,
  value: number | null | undefined,
): string {
  if (value == null || Number.isNaN(value)) return "—";
  const budget = PERF_BUDGETS[key];
  if (budget.unit === "rate") return `${(value * 100).toFixed(1)}%`;
  if (budget.unit === "score") return value.toFixed(3);
  if (budget.unit === "kb") return `${Math.round(value)} KB`;
  return `${Math.round(value)} ms`;
}
