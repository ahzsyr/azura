import { PerformanceDashboardClient } from "@/components/performance/performance-dashboard-client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const dynamic = "force-dynamic";

export default function AdminPerformancePage() {
  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6">
      <div>
        <h1 className="font-heading text-2xl font-bold tracking-tight">Performance</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Web Vitals and route metrics sync from the storefront tab via localStorage. Open the public
          site, navigate between pages, then return here — data refreshes every 2 seconds.
        </p>
      </div>

      <Card className="admin-card">
        <CardHeader>
          <CardTitle className="text-base">How to validate</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>1. Browse the storefront and click internal links (products, collections, CMS pages).</p>
          <p>2. Click &quot;Set baseline&quot; to snapshot current metrics.</p>
          <p>3. After further changes, compare deltas in the Before vs after card.</p>
          <p>
            4. Run <code className="rounded bg-muted px-1">npm run perf:bundle</code> and{" "}
            <code className="rounded bg-muted px-1">npm run perf:validate</code> after production
            builds.
          </p>
        </CardContent>
      </Card>

      <PerformanceDashboardClient />
    </div>
  );
}
