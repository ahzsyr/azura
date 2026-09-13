import { AdminPageHeader } from "@/components/admin/layout/admin-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { runAnalyticsRollupAction } from "@/modules/marketing/actions";

type DashboardData = Awaited<
  ReturnType<typeof import("@/modules/marketing/analytics/aggregate").analyticsAggregateService.getDashboardKpis>
>;

type LegacyStats = {
  providers: number;
  connections: number;
  leads: number;
  telemetry: {
    total: number;
    success: number;
    failure: number;
    successRate: number;
    avgDurationMs: number;
    rateLimitedCount: number;
  };
  jobs: Array<{ status: string; _count: number }>;
};

function fmt(n: number | null | undefined, digits = 0) {
  if (n == null || Number.isNaN(n)) return "—";
  return n.toLocaleString(undefined, { maximumFractionDigits: digits });
}

function pct(n: number | null | undefined) {
  if (n == null || Number.isNaN(n)) return "—";
  return `${(n * 100).toFixed(1)}%`;
}

export function MarketingDashboardPanel({
  kpis,
  integration,
}: {
  kpis: DashboardData;
  integration: LegacyStats;
}) {
  const t = kpis.totals;
  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Marketing Overview"
        description="Campaign intelligence command center. Spend, traffic, leads, and conversions — not social publishing telemetry."
        actions={
          <form action={runAnalyticsRollupAction}>
            <Button type="submit" variant="outline" size="sm">
              Refresh rollups
            </Button>
          </form>
        }
      />

      <div className="grid gap-4 md:grid-cols-4">
        <Metric title="Total spend" value={fmt(t.spend, 2)} />
        <Metric title="Visitors" value={fmt(t.visitors)} />
        <Metric title="Leads" value={fmt(t.leads)} />
        <Metric title="Conversions" value={fmt(t.conversions)} />
        <Metric title="Cost per lead" value={t.cpl != null ? fmt(t.cpl, 2) : "—"} />
        <Metric title="Cost per conversion" value={t.costPerConversion != null ? fmt(t.costPerConversion, 2) : "—"} />
        <Metric title="Conversion rate" value={pct(t.conversionRate)} />
        <Metric title="Active campaigns" value={fmt(kpis.activeCampaigns)} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Top campaigns</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {kpis.topCampaigns.length === 0 ? (
              <p className="text-muted-foreground">No campaign rollups yet.</p>
            ) : (
              kpis.topCampaigns.map((c) => (
                <div key={c.id} className="flex justify-between border-b py-1">
                  <span>{c.name}</span>
                  <span className="text-muted-foreground">
                    {c.conversions} conv · {c.leads} leads
                  </span>
                </div>
              ))
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recent conversions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {kpis.recentConversions.length === 0 ? (
              <p className="text-muted-foreground">No conversions recorded.</p>
            ) : (
              kpis.recentConversions.map((c) => (
                <div key={c.id} className="flex justify-between border-b py-1">
                  <span>{c.conversionDefinition.name}</span>
                  <span className="text-muted-foreground">
                    {c.internalCampaign?.name ?? "—"} · {c.source?.label ?? "—"}
                  </span>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <details className="rounded-xl border p-4">
        <summary className="cursor-pointer text-sm font-medium">Integration health</summary>
        <div className="mt-4 grid gap-4 md:grid-cols-4">
          <Metric title="Providers" value={String(integration.providers)} />
          <Metric title="Connections" value={String(integration.connections)} />
          <Metric title="Lead events" value={String(integration.leads)} />
          <Metric
            title="Telemetry success"
            value={`${(integration.telemetry.successRate * 100).toFixed(0)}%`}
          />
        </div>
        <div className="mt-3 space-y-1 text-sm">
          {integration.jobs.map((row) => (
            <div key={row.status} className="flex justify-between border-b py-1">
              <span>{row.status}</span>
              <span>{row._count}</span>
            </div>
          ))}
        </div>
      </details>
    </div>
  );
}

function Metric({ title, value }: { title: string; value: string }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
      </CardHeader>
      <CardContent className="text-2xl font-semibold">{value}</CardContent>
    </Card>
  );
}
