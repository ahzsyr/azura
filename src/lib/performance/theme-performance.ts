import {
  getRuntimeMetricsSnapshot,
  recordEffectCostMs,
  recordThemeRenderMs,
  startRuntimePerformanceMonitoring,
  type RuntimeMetricsSnapshot,
} from "./runtime-metrics";

/** @deprecated Use RuntimeMetricsSnapshot — kept for existing imports. */
export type ThemePerformanceSnapshot = {
  cls: number | null;
  lcp: number | null;
  inp: number | null;
  themeRenderMs: number | null;
  effectCostMs: number | null;
  updatedAt: number;
};

export function getThemePerformanceSnapshot(): ThemePerformanceSnapshot {
  const snap = getRuntimeMetricsSnapshot();
  return {
    cls: snap.cls,
    lcp: snap.lcp,
    inp: snap.inp,
    themeRenderMs: snap.themeRenderMs,
    effectCostMs: snap.effectCostMs,
    updatedAt: snap.updatedAt,
  };
}

export function markThemeRenderStart(): void {
  if (typeof performance === "undefined") return;
  performance.mark("az-theme-render-start");
}

export function markThemeRenderEnd(): void {
  if (typeof performance === "undefined") return;
  performance.mark("az-theme-render-end");
  try {
    performance.measure("az-theme-render", "az-theme-render-start", "az-theme-render-end");
    const entry = performance.getEntriesByName("az-theme-render").at(-1);
    if (entry) recordThemeRenderMs(entry.duration);
  } catch {
    /* marks may be missing */
  }
}

export function markEffectCostStart(): void {
  if (typeof performance === "undefined") return;
  performance.mark("az-effect-cost-start");
}

export function markEffectCostEnd(): void {
  if (typeof performance === "undefined") return;
  performance.mark("az-effect-cost-end");
  try {
    performance.measure("az-effect-cost", "az-effect-cost-start", "az-effect-cost-end");
    const entry = performance.getEntriesByName("az-effect-cost").at(-1);
    if (entry) recordEffectCostMs(entry.duration);
  } catch {
    /* ignore */
  }
}

/** Web Vitals observers — delegates to runtime metrics hub. */
export function startThemePerformanceMonitoring(): () => void {
  return startRuntimePerformanceMonitoring();
}

export type { RuntimeMetricsSnapshot };
