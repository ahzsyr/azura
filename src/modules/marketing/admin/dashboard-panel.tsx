import { AdminPageHeader } from "@/components/admin/layout/admin-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function MarketingDashboardPanel({
  stats,
}: {
  stats: {
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
}) {
  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Marketing Dashboard"
        description="Unified view of provider connections, jobs, leads, and telemetry."
      />
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader><CardTitle className="text-base">Providers</CardTitle></CardHeader>
          <CardContent className="text-2xl font-semibold">{stats.providers}</CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">Connections</CardTitle></CardHeader>
          <CardContent className="text-2xl font-semibold">{stats.connections}</CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">Leads</CardTitle></CardHeader>
          <CardContent className="text-2xl font-semibold">{stats.leads}</CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">Telemetry success</CardTitle></CardHeader>
          <CardContent className="text-2xl font-semibold">
            {(stats.telemetry.successRate * 100).toFixed(0)}%
          </CardContent>
        </Card>
      </div>
      <Card>
        <CardHeader><CardTitle>Job status breakdown</CardTitle></CardHeader>
        <CardContent className="space-y-1 text-sm">
          {stats.jobs.length === 0 ? (
            <p className="text-muted-foreground">No jobs recorded.</p>
          ) : (
            stats.jobs.map((row) => (
              <div key={row.status} className="flex justify-between border-b py-1">
                <span>{row.status}</span>
                <span>{row._count}</span>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
