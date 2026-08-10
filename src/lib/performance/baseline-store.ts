import type { RuntimeMetricsSnapshot } from "./runtime-metrics";

const BASELINE_KEY = "az-perf-baseline-v1";
const EXPORT_KEY = "az-perf-export-v1";

export type PerformanceBaseline = {
  label: string;
  capturedAt: number;
  snapshot: RuntimeMetricsSnapshot;
};

export function loadBaseline(): PerformanceBaseline | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(BASELINE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as PerformanceBaseline;
  } catch {
    return null;
  }
}

export function saveBaseline(snapshot: RuntimeMetricsSnapshot, label = "before"): PerformanceBaseline {
  const baseline: PerformanceBaseline = {
    label,
    capturedAt: Date.now(),
    snapshot,
  };
  if (typeof window !== "undefined") {
    window.localStorage.setItem(BASELINE_KEY, JSON.stringify(baseline));
  }
  return baseline;
}

export function clearBaseline(): void {
  if (typeof window !== "undefined") {
    window.localStorage.removeItem(BASELINE_KEY);
  }
}

export function exportMetricsJson(snapshot: RuntimeMetricsSnapshot): string {
  return JSON.stringify(
    {
      exportedAt: Date.now(),
      snapshot,
    },
    null,
    2,
  );
}

export function downloadMetricsExport(snapshot: RuntimeMetricsSnapshot): void {
  if (typeof window === "undefined") return;
  const blob = new Blob([exportMetricsJson(snapshot)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `azura-perf-${new Date().toISOString().slice(0, 19).replace(/:/g, "-")}.json`;
  anchor.click();
  URL.revokeObjectURL(url);
  window.localStorage.setItem(EXPORT_KEY, exportMetricsJson(snapshot));
}
