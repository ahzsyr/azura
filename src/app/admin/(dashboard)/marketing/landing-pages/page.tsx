import { AdminPageHeader } from "@/components/admin/layout/admin-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { analyticsAggregateService } from "@/modules/marketing/analytics/aggregate";

export const dynamic = "force-dynamic";

export default async function AdminMarketingLandingPagesPage() {
  const since = new Date();
  since.setDate(since.getDate() - 30);
  const rows = await analyticsAggregateService.landingPagePerformance(since).catch(() => []);

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Landing Pages"
        description="Which pages receive campaign traffic and convert."
      />
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Last 30 days</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1 text-sm">
          {rows.length === 0 ? (
            <p className="text-muted-foreground">No landing page events yet.</p>
          ) : (
            rows.map((r) => (
              <div key={r.landingPagePath} className="flex justify-between border-b py-1">
                <span>{r.landingPagePath}</span>
                <span className="text-muted-foreground">
                  {r.events} events · {r.conversions} conv · {(r.conversionRate * 100).toFixed(1)}%
                </span>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
