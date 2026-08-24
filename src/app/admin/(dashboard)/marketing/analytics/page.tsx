import { AdminPageHeader } from "@/components/admin/layout/admin-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { analyticsAggregateService } from "@/modules/marketing/analytics/aggregate";
import { campaignService } from "@/modules/marketing/campaigns/service";
import { runAnalyticsRollupAction } from "@/modules/marketing/actions";
import { marketingService } from "@/modules/marketing/service";

export const dynamic = "force-dynamic";

export default async function AdminMarketingAnalyticsPage() {
  const since = new Date();
  since.setDate(since.getDate() - 30);
  const campaigns = await campaignService.list().catch(() => []);
  const comparison = await analyticsAggregateService
    .compareCampaigns(
      campaigns.slice(0, 5).map((c) => c.id),
      since,
    )
    .catch(() => []);
  const snapshots = await marketingService.listAnalytics(50);
  const kpis = await analyticsAggregateService.getDashboardKpis(30).catch(() => null);

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Analytics & Reports"
        description="MVP metrics only: spend, traffic, leads, CPL, conversion rate. No ROI/ROAS until revenue exists."
        actions={
          <form action={runAnalyticsRollupAction}>
            <Button type="submit" size="sm" variant="outline">
              Run daily rollup
            </Button>
          </form>
        }
      />

      {kpis ? (
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">Spend</CardTitle>
            </CardHeader>
            <CardContent className="text-2xl font-semibold">{kpis.totals.spend.toFixed(2)}</CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">Visitors</CardTitle>
            </CardHeader>
            <CardContent className="text-2xl font-semibold">{kpis.totals.visitors}</CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">Leads</CardTitle>
            </CardHeader>
            <CardContent className="text-2xl font-semibold">{kpis.totals.leads}</CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">CPL</CardTitle>
            </CardHeader>
            <CardContent className="text-2xl font-semibold">
              {kpis.totals.cpl != null ? kpis.totals.cpl.toFixed(2) : "—"}
            </CardContent>
          </Card>
        </div>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Campaign comparison</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="py-1">Campaign</th>
                <th>Spend</th>
                <th>Impr.</th>
                <th>Clicks</th>
                <th>Visitors</th>
                <th>Leads</th>
                <th>Conv.</th>
                <th>CPL</th>
                <th>CVR</th>
              </tr>
            </thead>
            <tbody>
              {comparison.map((c) => (
                <tr key={c.id} className="border-b">
                  <td className="py-1">{c.name}</td>
                  <td>{c.spend.toFixed(2)}</td>
                  <td>{c.impressions}</td>
                  <td>{c.clicks}</td>
                  <td>{c.visitors}</td>
                  <td>{c.leads}</td>
                  <td>{c.conversions}</td>
                  <td>{c.cpl != null ? c.cpl.toFixed(2) : "—"}</td>
                  <td>{c.conversionRate != null ? `${(c.conversionRate * 100).toFixed(1)}%` : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {comparison.length === 0 ? (
            <p className="mt-2 text-muted-foreground">No comparison data yet.</p>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Provider snapshots</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1 text-sm">
          {snapshots.length === 0 ? (
            <p className="text-muted-foreground">No provider analytics snapshots.</p>
          ) : (
            snapshots.map((s) => (
              <div key={s.id} className="flex justify-between border-b py-1">
                <span>
                  {s.providerId} · {s.metric}
                </span>
                <span>{s.value}</span>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
