"use client";

import { useEffect, useState } from "react";
import {
  clearBaseline,
  downloadMetricsExport,
  loadBaseline,
  saveBaseline,
} from "@/lib/performance/baseline-store";
import {
  compareSnapshots,
  getRuntimeMetricsSnapshot,
  loadPersistedMetricsSnapshot,
  subscribeRuntimeMetrics,
  type RuntimeMetricsSnapshot,
} from "@/lib/performance/runtime-metrics";
import {
  formatMetricValue,
  PERF_BUDGETS,
  rateMetric,
  type VitalRating,
} from "@/lib/performance/vitals-budgets";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type Props = {
  variant?: "admin" | "dev";
};

function ratingClass(rating: VitalRating): string {
  if (rating === "good") return "bg-emerald-600";
  if (rating === "needs-improvement") return "bg-amber-500";
  if (rating === "poor") return "bg-red-600 text-white border-transparent";
  return "bg-muted text-muted-foreground";
}

function MetricCard({
  label,
  value,
  budgetKey,
}: {
  label: string;
  value: number | null;
  budgetKey: keyof typeof PERF_BUDGETS;
}) {
  const rating = rateMetric(budgetKey, value);
  return (
    <Card className="admin-card">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
      </CardHeader>
      <CardContent className="flex items-center justify-between gap-2">
        <span className="text-2xl font-semibold tabular-nums">
          {formatMetricValue(budgetKey, value)}
        </span>
        <Badge className={cn("shrink-0", ratingClass(rating))}>
          {rating === "unknown" ? "pending" : rating.replace("-", " ")}
        </Badge>
      </CardContent>
    </Card>
  );
}

export function PerformanceDashboardClient({ variant = "admin" }: Props) {
  const [snapshot, setSnapshot] = useState<RuntimeMetricsSnapshot>(() =>
    getRuntimeMetricsSnapshot(),
  );
  const [baselineLabel, setBaselineLabel] = useState<string | null>(null);

  useEffect(() => {
    const baseline = loadBaseline();
    setBaselineLabel(baseline?.label ?? null);

    const refresh = () => {
      const persisted = loadPersistedMetricsSnapshot();
      const live = getRuntimeMetricsSnapshot();
      setSnapshot(
        (persisted?.updatedAt ?? 0) > (live.updatedAt ?? 0) ? persisted! : live,
      );
    };

    refresh();
    const unsubscribe = subscribeRuntimeMetrics(setSnapshot);
    const pollId = window.setInterval(refresh, 2000);
    return () => {
      unsubscribe();
      window.clearInterval(pollId);
    };
  }, []);

  const baseline = loadBaseline();
  const comparison = baseline ? compareSnapshots(snapshot, baseline.snapshot) : null;
  const failureRate =
    snapshot.navigationCount > 0
      ? snapshot.navigationFailureCount / snapshot.navigationCount
      : snapshot.routeFailures.length > 0
        ? 1
        : 0;

  return (
    <div className={cn("space-y-6", variant === "dev" && "text-xs")}>
      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => {
            const saved = saveBaseline(snapshot, "baseline");
            setBaselineLabel(saved.label);
          }}
        >
          Set baseline
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => downloadMetricsExport(snapshot)}
        >
          Export JSON
        </Button>
        {baselineLabel ? (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => {
              clearBaseline();
              setBaselineLabel(null);
            }}
          >
            Clear baseline ({baselineLabel})
          </Button>
        ) : null}
        <span className="text-xs text-muted-foreground">
          Updated {new Date(snapshot.updatedAt).toLocaleTimeString()}
        </span>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <MetricCard label="LCP" value={snapshot.lcp} budgetKey="lcp" />
        <MetricCard label="CLS" value={snapshot.cls} budgetKey="cls" />
        <MetricCard label="INP" value={snapshot.inp} budgetKey="inp" />
        <MetricCard label="Hydration" value={snapshot.hydrationMs} budgetKey="hydration" />
        <MetricCard
          label="Avg route transition"
          value={snapshot.avgRouteTransitionMs}
          budgetKey="routeTransition"
        />
        <MetricCard
          label="P95 route transition"
          value={snapshot.p95RouteTransitionMs}
          budgetKey="routeTransitionP95"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="admin-card">
          <CardHeader>
            <CardTitle className="text-base">Route health</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>
              Navigations tracked: <strong>{snapshot.navigationCount}</strong>
            </p>
            <p>
              Failures: <strong>{snapshot.routeFailures.length}</strong> (
              {formatMetricValue("routeFailureRate", failureRate)})
            </p>
            <p>
              Theme render: {snapshot.themeRenderMs ?? "—"} ms · Effects:{" "}
              {snapshot.effectCostMs ?? "—"} ms
            </p>
          </CardContent>
        </Card>

        {comparison ? (
          <Card className="admin-card">
            <CardHeader>
              <CardTitle className="text-base">Before vs after</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm">
                {comparison.map((row) => (
                  <li key={row.key} className="flex items-center justify-between gap-3">
                    <span>{row.key}</span>
                    <span className="tabular-nums text-muted-foreground">
                      {row.baseline ?? "—"} → {row.current ?? "—"}
                      {row.delta != null ? (
                        <span
                          className={cn(
                            "ms-2",
                            row.improved ? "text-emerald-600" : "text-amber-600",
                          )}
                        >
                          {row.delta > 0 ? "+" : ""}
                          {Math.round(row.delta * 1000) / 1000}
                        </span>
                      ) : null}
                    </span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ) : (
          <Card className="admin-card">
            <CardHeader>
              <CardTitle className="text-base">Before vs after</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Click &quot;Set baseline&quot; after browsing the storefront, then navigate again to
              compare improvements.
            </CardContent>
          </Card>
        )}
      </div>

      <Card className="admin-card">
        <CardHeader>
          <CardTitle className="text-base">Slow routes (avg ≥ 400 ms)</CardTitle>
        </CardHeader>
        <CardContent>
          {snapshot.slowRoutes.length === 0 ? (
            <p className="text-sm text-muted-foreground">No slow routes recorded yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="py-2 pe-4">Route</th>
                    <th className="py-2 pe-4">Avg</th>
                    <th className="py-2">Samples</th>
                  </tr>
                </thead>
                <tbody>
                  {snapshot.slowRoutes.map((row) => (
                    <tr key={row.path} className="border-b border-border/50">
                      <td className="py-2 pe-4 font-mono text-xs">{row.path}</td>
                      <td className="py-2 pe-4 tabular-nums">{row.avgMs} ms</td>
                      <td className="py-2 tabular-nums">{row.count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {snapshot.routeFailures.length > 0 ? (
        <Card className="admin-card">
          <CardHeader>
            <CardTitle className="text-base">Route failures</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {snapshot.routeFailures.slice(0, 8).map((fail) => (
              <div key={fail.id} className="rounded-md border border-border/60 p-3 text-sm">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline">{fail.kind}</Badge>
                  <span className="font-mono text-xs text-muted-foreground">{fail.pathname}</span>
                </div>
                <p className="mt-1 text-muted-foreground">{fail.message}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}

      {snapshot.routeTransitions.length > 0 ? (
        <Card className="admin-card">
          <CardHeader>
            <CardTitle className="text-base">Recent transitions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="py-2 pe-3">To</th>
                    <th className="py-2 pe-3">Duration</th>
                    <th className="py-2 pe-3">Skeleton</th>
                    <th className="py-2">OK</th>
                  </tr>
                </thead>
                <tbody>
                  {snapshot.routeTransitions.slice(0, 12).map((row) => (
                    <tr key={row.id} className="border-b border-border/50">
                      <td className="py-2 pe-3 font-mono text-xs">{row.to}</td>
                      <td className="py-2 pe-3 tabular-nums">{row.durationMs ?? "—"} ms</td>
                      <td className="py-2 pe-3">{row.hadSkeleton ? "yes" : "no"}</td>
                      <td className="py-2">{row.success ? "✓" : "✗"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
