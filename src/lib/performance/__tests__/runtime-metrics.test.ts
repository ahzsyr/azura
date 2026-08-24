import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { compareSnapshots } from "../runtime-metrics";
import { rateMetric } from "../vitals-budgets";
import type { RuntimeMetricsSnapshot } from "../runtime-metrics";

function emptySnapshot(overrides: Partial<RuntimeMetricsSnapshot> = {}): RuntimeMetricsSnapshot {
  return {
    lcp: null,
    cls: null,
    inp: null,
    hydrationMs: null,
    themeRenderMs: null,
    effectCostMs: null,
    routeTransitions: [],
    routeFailures: [],
    navigationCount: 0,
    navigationFailureCount: 0,
    avgRouteTransitionMs: null,
    p95RouteTransitionMs: null,
    slowRoutes: [],
    updatedAt: Date.now(),
    ...overrides,
  };
}

describe("rateMetric", () => {
  it("rates LCP within good budget", () => {
    assert.equal(rateMetric("lcp", 2000), "good");
    assert.equal(rateMetric("lcp", 3500), "needs-improvement");
    assert.equal(rateMetric("lcp", 5000), "poor");
  });
});

describe("compareSnapshots", () => {
  it("detects improvement when route transition drops", () => {
    const baseline = emptySnapshot({ avgRouteTransitionMs: 900, lcp: 3200 });
    const current = emptySnapshot({ avgRouteTransitionMs: 350, lcp: 2100 });
    const rows = compareSnapshots(current, baseline);
    const transition = rows.find((r) => r.key === "Avg route transition");
    const lcp = rows.find((r) => r.key === "LCP");
    assert.equal(transition?.improved, true);
    assert.equal(lcp?.improved, true);
  });
});
