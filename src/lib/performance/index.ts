export { observeIntersection } from "./intersection-observer-hub";
export { deferUntilIdle } from "./defer-until-idle";
export {
  getThemePerformanceSnapshot,
  markThemeRenderStart,
  markThemeRenderEnd,
  markEffectCostStart,
  markEffectCostEnd,
  startThemePerformanceMonitoring,
  type ThemePerformanceSnapshot,
} from "./theme-performance";
export {
  getRuntimeMetricsSnapshot,
  subscribeRuntimeMetrics,
  recordNavigationStart,
  recordNavigationEnd,
  markNavigationSkeletonActive,
  recordRouteFailure,
  recordHydrationMs,
  compareSnapshots,
  startRuntimePerformanceMonitoring,
  loadPersistedMetricsSnapshot,
  type RuntimeMetricsSnapshot,
  type RouteTransitionRecord,
  type RouteFailureRecord,
} from "./runtime-metrics";
export {
  loadBaseline,
  saveBaseline,
  clearBaseline,
  downloadMetricsExport,
  exportMetricsJson,
  type PerformanceBaseline,
} from "./baseline-store";
export {
  PERF_BUDGETS,
  rateMetric,
  formatMetricValue,
  type VitalRating,
} from "./vitals-budgets";
