import { AdminPageHeader } from "@/components/admin/layout/admin-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { marketingService } from "@/modules/marketing/service";
import { runMarketingJobsAction } from "@/modules/marketing/actions";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function AdminMarketingIntegrationsPage() {
  const [stats, jobs, webhooks] = await Promise.all([
    marketingService.getDashboardStats(),
    marketingService.listJobs(30),
    prisma.marketingWebhookEvent.findMany({ take: 20, orderBy: { receivedAt: "desc" } }).catch(() => []),
  ]);

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Integrations"
        description="Provider connections, jobs, and webhook health."
        actions={
          <form action={runMarketingJobsAction}>
            <Button type="submit" size="sm" variant="outline">
              Run due jobs
            </Button>
          </form>
        }
      />
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Providers</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{stats.providers}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Connections</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{stats.connections}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Jobs recorded</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">
            {stats.jobs.reduce((n, j) => n + j._count, 0)}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Telemetry success</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">
            {(stats.telemetry.successRate * 100).toFixed(0)}%
          </CardContent>
        </Card>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent jobs</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1 text-sm">
          {jobs.map((j) => (
            <div key={j.id} className="flex justify-between border-b py-1">
              <span>
                {j.jobType} · {j.status}
              </span>
              <span className="text-muted-foreground">{j.providerId ?? "—"}</span>
            </div>
          ))}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent webhooks</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1 text-sm">
          {webhooks.length === 0 ? (
            <p className="text-muted-foreground">No webhooks.</p>
          ) : (
            webhooks.map((w) => (
              <div key={w.id} className="flex justify-between border-b py-1">
                <span>
                  {w.providerId} · {w.eventType}
                </span>
                <span>{w.status}</span>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
