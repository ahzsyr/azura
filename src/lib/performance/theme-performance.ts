type LayoutShiftEntry = PerformanceEntry & {
  hadRecentInput?: boolean;
  value?: number;
};

export type ThemePerformanceSnapshot = {
  cls: number | null;
  lcp: number | null;
  inp: number | null;
  themeRenderMs: number | null;
  effectCostMs: number | null;
  updatedAt: number;
};

declare global {
  interface Window {
    __AZ_THEME_PERF__?: ThemePerformanceSnapshot;
  }
}

const snapshot: ThemePerformanceSnapshot = {
  cls: null,
  lcp: null,
  inp: null,
  themeRenderMs: null,
  effectCostMs: null,
  updatedAt: Date.now(),
};

function publish(): void {
  snapshot.updatedAt = Date.now();
  if (typeof window !== "undefined") {
    window.__AZ_THEME_PERF__ = { ...snapshot };
  }
}

export function getThemePerformanceSnapshot(): ThemePerformanceSnapshot {
  return { ...snapshot };
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
    if (entry) {
      snapshot.themeRenderMs = Math.round(entry.duration * 100) / 100;
      publish();
    }
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
    if (entry) {
      snapshot.effectCostMs = Math.round(entry.duration * 100) / 100;
      publish();
    }
  } catch {
    /* ignore */
  }
}

/** Web Vitals observers — client-only. */
export function startThemePerformanceMonitoring(): () => void {
  if (typeof window === "undefined" || typeof PerformanceObserver === "undefined") {
    return () => {};
  }

  const disconnectors: Array<() => void> = [];

  try {
    const lcpObs = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const last = entries.at(-1);
      if (last) {
        snapshot.lcp = Math.round(last.startTime);
        publish();
      }
    });
    lcpObs.observe({ type: "largest-contentful-paint", buffered: true });
    disconnectors.push(() => lcpObs.disconnect());
  } catch {
    /* unsupported */
  }

  try {
    let clsValue = 0;
    const clsObs = new PerformanceObserver((list) => {
      for (const entry of list.getEntries() as LayoutShiftEntry[]) {
        if (entry.hadRecentInput) continue;
        clsValue += entry.value ?? 0;
      }
      snapshot.cls = Math.round(clsValue * 1000) / 1000;
      publish();
    });
    clsObs.observe({ type: "layout-shift", buffered: true });
    disconnectors.push(() => clsObs.disconnect());
  } catch {
    /* unsupported */
  }

  try {
    const inpObs = new PerformanceObserver((list) => {
      const entries = list.getEntries() as PerformanceEventTiming[];
      const last = entries.filter((e) => e.duration >= 40).at(-1);
      if (last) {
        snapshot.inp = Math.round(last.duration);
        publish();
      }
    });
    inpObs.observe({ type: "event", buffered: true });
    disconnectors.push(() => inpObs.disconnect());
  } catch {
    /* unsupported */
  }

  publish();

  return () => {
    for (const off of disconnectors) off();
  };
}
