import { rateMetric, type VitalRating } from "./vitals-budgets";

type LayoutShiftEntry = PerformanceEntry & {
  hadRecentInput?: boolean;
  value?: number;
};

export type RouteTransitionRecord = {
  id: string;
  from: string;
  to: string;
  startedAt: number;
  endedAt: number | null;
  durationMs: number | null;
  hadSkeleton: boolean;
  success: boolean;
};

export type RouteFailureRecord = {
  id: string;
  at: number;
  pathname: string;
  message: string;
  kind: "navigation" | "render" | "chunk" | "unknown";
  digest?: string;
};

export type RouteVitalsRecord = {
  path: string;
  capturedAt: number;
  lcp: number | null;
  cls: number | null;
  inp: number | null;
  fcp: number | null;
  ttfb: number | null;
  hydrationMs: number | null;
  routeTransitionMs: number | null;
};

export type RuntimeMetricsSnapshot = {
  lcp: number | null;
  cls: number | null;
  inp: number | null;
  fcp: number | null;
  ttfb: number | null;
  hydrationMs: number | null;
  themeRenderMs: number | null;
  effectCostMs: number | null;
  routeVitals: RouteVitalsRecord[];
  routeTransitions: RouteTransitionRecord[];
  routeFailures: RouteFailureRecord[];
  navigationCount: number;
  navigationFailureCount: number;
  avgRouteTransitionMs: number | null;
  p95RouteTransitionMs: number | null;
  slowRoutes: Array<{ path: string; avgMs: number; count: number }>;
  updatedAt: number;
};

declare global {
  interface Window {
    __AZ_RUNTIME_METRICS__?: RuntimeMetricsSnapshot;
    __AZ_THEME_PERF__?: {
      cls: number | null;
      lcp: number | null;
      inp: number | null;
      themeRenderMs: number | null;
      effectCostMs: number | null;
      updatedAt: number;
    };
  }
}

const MAX_TRANSITIONS = 80;
const MAX_FAILURES = 40;
const LATEST_METRICS_KEY = "az-runtime-metrics-latest-v1";
let lastPersistAt = 0;

const state = {
  lcp: null as number | null,
  cls: null as number | null,
  inp: null as number | null,
  fcp: null as number | null,
  ttfb: null as number | null,
  hydrationMs: null as number | null,
  themeRenderMs: null as number | null,
  effectCostMs: null as number | null,
  routeVitals: [] as RouteVitalsRecord[],
  routeTransitions: [] as RouteTransitionRecord[],
  routeFailures: [] as RouteFailureRecord[],
  pendingTransition: null as RouteTransitionRecord | null,
};

const listeners = new Set<(snapshot: RuntimeMetricsSnapshot) => void>();

function percentile(values: number[], p: number): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1);
  return Math.round(sorted[index] ?? sorted[0]!);
}

function computeSlowRoutes(
  transitions: RouteTransitionRecord[],
): Array<{ path: string; avgMs: number; count: number }> {
  const byPath = new Map<string, number[]>();
  for (const t of transitions) {
    if (t.durationMs == null || !t.success) continue;
    const list = byPath.get(t.to) ?? [];
    list.push(t.durationMs);
    byPath.set(t.to, list);
  }
  return [...byPath.entries()]
    .map(([path, durations]) => ({
      path,
      avgMs: Math.round(durations.reduce((a, b) => a + b, 0) / durations.length),
      count: durations.length,
    }))
    .filter((row) => row.avgMs >= 400)
    .sort((a, b) => b.avgMs - a.avgMs)
    .slice(0, 12);
}

function buildSnapshot(): RuntimeMetricsSnapshot {
  const completed = state.routeTransitions.filter((t) => t.durationMs != null);
  const durations = completed.map((t) => t.durationMs!);
  return {
    lcp: state.lcp,
    cls: state.cls,
    inp: state.inp,
    fcp: state.fcp,
    ttfb: state.ttfb,
    hydrationMs: state.hydrationMs,
    themeRenderMs: state.themeRenderMs,
    effectCostMs: state.effectCostMs,
    routeVitals: [...state.routeVitals],
    routeTransitions: [...state.routeTransitions],
    routeFailures: [...state.routeFailures],
    navigationCount: completed.length,
    navigationFailureCount: state.routeFailures.length,
    avgRouteTransitionMs:
      durations.length > 0
        ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)
        : null,
    p95RouteTransitionMs: percentile(durations, 95),
    slowRoutes: computeSlowRoutes(state.routeTransitions),
    updatedAt: Date.now(),
  };
}

function publish(): RuntimeMetricsSnapshot {
  const snapshot = buildSnapshot();

  if (typeof window !== "undefined") {
    window.__AZ_RUNTIME_METRICS__ = snapshot;
    window.__AZ_THEME_PERF__ = {
      cls: snapshot.cls,
      lcp: snapshot.lcp,
      inp: snapshot.inp,
      themeRenderMs: snapshot.themeRenderMs,
      effectCostMs: snapshot.effectCostMs,
      updatedAt: snapshot.updatedAt,
    };
  }

  for (const listener of listeners) listener(snapshot);

  if (typeof window !== "undefined" && snapshot.updatedAt - lastPersistAt > 1000) {
    lastPersistAt = snapshot.updatedAt;
    try {
      window.localStorage.setItem(LATEST_METRICS_KEY, JSON.stringify(snapshot));
    } catch {
      /* quota */
    }
  }

  return snapshot;
}

export function loadPersistedMetricsSnapshot(): RuntimeMetricsSnapshot | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(LATEST_METRICS_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as RuntimeMetricsSnapshot;
  } catch {
    return null;
  }
}

export function getRuntimeMetricsSnapshot(): RuntimeMetricsSnapshot {
  const live = buildSnapshot();
  if (live.navigationCount > 0 || live.lcp != null || live.routeFailures.length > 0) {
    return live;
  }
  return loadPersistedMetricsSnapshot() ?? live;
}

export function subscribeRuntimeMetrics(
  listener: (snapshot: RuntimeMetricsSnapshot) => void,
): () => void {
  listeners.add(listener);
  listener(publish());
  return () => listeners.delete(listener);
}

export function recordHydrationMs(ms: number): void {
  state.hydrationMs = Math.round(ms);
  publish();
}

export function measureHydrationFromNavigation(): number | null {
  if (typeof performance === "undefined") return null;
  const nav = performance.getEntriesByType("navigation")[0] as
    | PerformanceNavigationTiming
    | undefined;
  if (!nav) return null;
  const ms = nav.domContentLoadedEventEnd - nav.startTime;
  return ms > 0 ? Math.round(ms) : null;
}

function recordRouteVitals(path: string, routeTransitionMs: number | null): void {
  state.routeVitals.unshift({
    path,
    capturedAt: Date.now(),
    lcp: state.lcp,
    cls: state.cls,
    inp: state.inp,
    fcp: state.fcp,
    ttfb: state.ttfb,
    hydrationMs: state.hydrationMs,
    routeTransitionMs,
  });
  if (state.routeVitals.length > MAX_TRANSITIONS) {
    state.routeVitals.length = MAX_TRANSITIONS;
  }
}

export function recordThemeRenderMs(ms: number): void {
  state.themeRenderMs = Math.round(ms * 100) / 100;
  publish();
}

export function recordEffectCostMs(ms: number): void {
  state.effectCostMs = Math.round(ms * 100) / 100;
  publish();
}

export function recordNavigationStart(from: string, to: string): string {
  const id = `nav-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  state.pendingTransition = {
    id,
    from,
    to,
    startedAt: performance.now(),
    endedAt: null,
    durationMs: null,
    hadSkeleton: false,
    success: true,
  };
  return id;
}

export function markNavigationSkeletonActive(): void {
  if (state.pendingTransition) {
    state.pendingTransition.hadSkeleton = true;
  }
}

export function recordNavigationEnd(
  to: string,
  options?: { success?: boolean; transitionId?: string },
): void {
  const pending = state.pendingTransition;
  if (!pending || (options?.transitionId && pending.id !== options.transitionId)) {
    return;
  }
  if (pending.to !== to && !to.startsWith(pending.to)) {
    pending.to = to;
  }

  const endedAt = performance.now();
  pending.endedAt = endedAt;
  pending.durationMs = Math.round(endedAt - pending.startedAt);
  pending.success = options?.success !== false;

  state.routeTransitions.unshift({ ...pending });
  if (state.routeTransitions.length > MAX_TRANSITIONS) {
    state.routeTransitions.length = MAX_TRANSITIONS;
  }
  recordRouteVitals(pending.to, pending.durationMs);
  state.pendingTransition = null;
  publish();
}

export function recordRouteFailure(input: {
  pathname: string;
  message: string;
  kind?: RouteFailureRecord["kind"];
  digest?: string;
}): void {
  state.routeFailures.unshift({
    id: `fail-${Date.now()}`,
    at: Date.now(),
    pathname: input.pathname,
    message: input.message.slice(0, 500),
    kind: input.kind ?? "unknown",
    digest: input.digest,
  });
  if (state.routeFailures.length > MAX_FAILURES) {
    state.routeFailures.length = MAX_FAILURES;
  }
  publish();
}

export function compareSnapshots(
  current: RuntimeMetricsSnapshot,
  baseline: RuntimeMetricsSnapshot,
): Array<{
  key: string;
  current: number | null;
  baseline: number | null;
  delta: number | null;
  improved: boolean | null;
  rating: VitalRating;
}> {
  const rows: Array<{
    key: string;
    current: number | null;
    baseline: number | null;
    delta: number | null;
    improved: boolean | null;
    rating: VitalRating;
  }> = [];

  const pairs: Array<{
    key: string;
    metric: keyof typeof import("./vitals-budgets").PERF_BUDGETS;
    current: number | null;
    baseline: number | null;
    lowerIsBetter: boolean;
  }> = [
    { key: "LCP", metric: "lcp", current: current.lcp, baseline: baseline.lcp, lowerIsBetter: true },
    { key: "CLS", metric: "cls", current: current.cls, baseline: baseline.cls, lowerIsBetter: true },
    { key: "INP", metric: "inp", current: current.inp, baseline: baseline.inp, lowerIsBetter: true },
    {
      key: "Hydration",
      metric: "hydration",
      current: current.hydrationMs,
      baseline: baseline.hydrationMs,
      lowerIsBetter: true,
    },
    {
      key: "Avg route transition",
      metric: "routeTransition",
      current: current.avgRouteTransitionMs,
      baseline: baseline.avgRouteTransitionMs,
      lowerIsBetter: true,
    },
    {
      key: "P95 route transition",
      metric: "routeTransitionP95",
      current: current.p95RouteTransitionMs,
      baseline: baseline.p95RouteTransitionMs,
      lowerIsBetter: true,
    },
  ];

  for (const row of pairs) {
    const delta =
      row.current != null && row.baseline != null ? row.current - row.baseline : null;
    const improved =
      delta == null ? null : row.lowerIsBetter ? delta < 0 : delta > 0;
    rows.push({
      key: row.key,
      current: row.current,
      baseline: row.baseline,
      delta,
      improved,
      rating: rateMetric(row.metric, row.current),
    });
  }

  return rows;
}

let monitoringStarted = false;

/** Web Vitals + global error observers — client-only. */
export function startRuntimePerformanceMonitoring(): () => void {
  if (typeof window === "undefined" || typeof PerformanceObserver === "undefined") {
    return () => {};
  }
  if (monitoringStarted) return () => {};
  monitoringStarted = true;

  const disconnectors: Array<() => void> = [];

  const hydration = measureHydrationFromNavigation();
  if (hydration != null) recordHydrationMs(hydration);

  try {
    const nav = performance.getEntriesByType("navigation")[0] as
      | PerformanceNavigationTiming
      | undefined;
    if (nav?.responseStart != null) {
      state.ttfb = Math.round(nav.responseStart - nav.startTime);
    }
  } catch {
    /* unsupported */
  }

  try {
    for (const entry of performance.getEntriesByType("paint")) {
      if (entry.name === "first-contentful-paint") {
        state.fcp = Math.round(entry.startTime);
      }
    }
  } catch {
    /* unsupported */
  }

  try {
    const paintObs = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.name === "first-contentful-paint") {
          state.fcp = Math.round(entry.startTime);
          publish();
        }
      }
    });
    paintObs.observe({ type: "paint", buffered: true });
    disconnectors.push(() => paintObs.disconnect());
  } catch {
    /* unsupported */
  }

  try {
    const lcpObs = new PerformanceObserver((list) => {
      const last = list.getEntries().at(-1);
      if (last) {
        state.lcp = Math.round(last.startTime);
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
      state.cls = Math.round(clsValue * 1000) / 1000;
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
        state.inp = Math.round(last.duration);
        publish();
      }
    });
    inpObs.observe({ type: "event", buffered: true });
    disconnectors.push(() => inpObs.disconnect());
  } catch {
    /* unsupported */
  }

  const onError = (event: ErrorEvent) => {
    const message = event.message || "Script error";
    const isChunk =
      message.includes("Loading chunk") ||
      message.includes("ChunkLoadError") ||
      message.includes("Failed to fetch dynamically imported module");
    recordRouteFailure({
      pathname: window.location.pathname,
      message,
      kind: isChunk ? "chunk" : "unknown",
    });
  };

  const onRejection = (event: PromiseRejectionEvent) => {
    const reason = event.reason;
    const message =
      reason instanceof Error ? reason.message : typeof reason === "string" ? reason : "Promise rejection";
    const isChunk =
      message.includes("Loading chunk") ||
      message.includes("ChunkLoadError") ||
      message.includes("dynamically imported module");
    recordRouteFailure({
      pathname: window.location.pathname,
      message,
      kind: isChunk ? "chunk" : "unknown",
    });
  };

  window.addEventListener("error", onError);
  window.addEventListener("unhandledrejection", onRejection);
  disconnectors.push(() => {
    window.removeEventListener("error", onError);
    window.removeEventListener("unhandledrejection", onRejection);
  });

  publish();
  if (typeof window !== "undefined") {
    recordRouteVitals(window.location.pathname, null);
    publish();
  }

  return () => {
    monitoringStarted = false;
    for (const off of disconnectors) off();
  };
}
