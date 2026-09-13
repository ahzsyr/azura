import type { SeoProviderHealth } from "@/features/seo/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export function statusBadge(health: SeoProviderHealth) {
  if (!health.enabled) return <Badge variant="outline">Disabled</Badge>;
  if (!health.configured) {
    return <Badge className="bg-red-600 text-white border-transparent">Needs setup</Badge>;
  }
  return <Badge className={health.ok ? "bg-emerald-600" : "bg-amber-500"}>{health.message}</Badge>;
}

type SubmissionMetrics = {
  pending: number;
  failed: number;
  completed: number;
  running: number;
  exhausted: number;
  failedLast24h: number;
  stuck: number;
  providerStats: Array<{
    provider: string;
    completed: number;
    failed: number;
    exhausted: number;
    total: number;
    successRate: number;
  }>;
  recent: Array<{
    id: string;
    provider: string;
    kind: string;
    status: string;
    url: string;
    lastError: string | null;
  }>;
};

type ProviderTelemetry = Array<{
  provider: string;
  successRate: number;
  p95LatencyMs: number;
  failures: number;
  volume: number;
}>;

type SearchReport = {
  totalClicks: number;
  totalImpressions: number;
  topPages: Array<{ key: string; clicks: number }>;
  topQueries: Array<{ key: string; clicks: number }>;
};

type IntegrationsMonitorPanelProps = {
  health: SeoProviderHealth[];
  metrics: SubmissionMetrics;
  telemetry: ProviderTelemetry;
  searchReport: SearchReport;
};

export function IntegrationsMonitorPanel({
  health,
  metrics,
  telemetry,
  searchReport,
}: IntegrationsMonitorPanelProps) {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-4 lg:grid-cols-7">
        {[
          ["Pending", metrics.pending],
          ["Running", metrics.running],
          ["Failed", metrics.failed],
          ["Exhausted", metrics.exhausted],
          ["Completed", metrics.completed],
          ["Failed 24h", metrics.failedLast24h],
          ["Stuck", metrics.stuck],
        ].map(([label, value]) => (
          <Card key={label}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
            </CardHeader>
            <CardContent className="text-2xl font-semibold tabular-nums">{value}</CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Provider health</CardTitle>
          <CardDescription>Credential and enablement status for each provider.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-3">
          {health.map((item) => (
            <div key={item.provider} className="rounded-lg border p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-medium capitalize">{item.provider}</p>
                {statusBadge(item)}
              </div>
              <p className="mt-2 text-xs text-muted-foreground">{item.message}</p>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Provider success rates</CardTitle>
          <CardDescription>Based on the latest completed, failed, and exhausted jobs.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-3">
          {metrics.providerStats.map((provider) => (
            <div key={provider.provider} className="rounded-lg border p-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium capitalize">{provider.provider}</p>
                <span className="text-lg font-semibold tabular-nums">{provider.successRate}%</span>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                {provider.completed} completed · {provider.failed} failed · {provider.exhausted} exhausted
              </p>
            </div>
          ))}
          {metrics.providerStats.length === 0 ? (
            <p className="text-sm text-muted-foreground">No provider results yet.</p>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Provider telemetry</CardTitle>
          <CardDescription>Reliability and latency from recorded submission events.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-3">
          {telemetry.map((provider) => (
            <div key={provider.provider} className="rounded-lg border p-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium capitalize">{provider.provider}</p>
                <span className="text-lg font-semibold tabular-nums">{provider.successRate}%</span>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                P95 {provider.p95LatencyMs}ms · {provider.volume} events · {provider.failures} failures
              </p>
            </div>
          ))}
          {telemetry.length === 0 ? (
            <p className="text-sm text-muted-foreground">No telemetry events recorded yet.</p>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Search analytics</CardTitle>
          <CardDescription>
            Stored metrics from Google Search Console (source: google) and GA4 (source: ga4).{" "}
            {searchReport.totalClicks} clicks and {searchReport.totalImpressions} impressions in the stored window.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div>
            <h3 className="text-sm font-medium">Top pages</h3>
            <div className="mt-2 space-y-2 text-sm">
              {searchReport.topPages.slice(0, 5).map((row) => (
                <div key={row.key} className="flex justify-between gap-3 border-b pb-2">
                  <span className="truncate text-muted-foreground">{row.key}</span>
                  <span className="font-medium tabular-nums">{row.clicks}</span>
                </div>
              ))}
            </div>
          </div>
          <div>
            <h3 className="text-sm font-medium">Top queries</h3>
            <div className="mt-2 space-y-2 text-sm">
              {searchReport.topQueries.slice(0, 5).map((row) => (
                <div key={row.key} className="flex justify-between gap-3 border-b pb-2">
                  <span className="truncate text-muted-foreground">{row.key}</span>
                  <span className="font-medium tabular-nums">{row.clicks}</span>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
