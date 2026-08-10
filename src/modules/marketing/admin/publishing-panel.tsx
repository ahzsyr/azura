import { AdminPageHeader } from "@/components/admin/layout/admin-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { runMarketingJobsAction, enqueueManualPublishAction } from "@/modules/marketing/actions";

type Job = {
  id: string;
  jobType: string;
  status: string;
  workflowStage: string;
  providerId: string | null;
  attemptCount: number;
  lastError: string | null;
  scheduledAt: Date;
};

export function MarketingPublishingPanel({ jobs }: { jobs: Job[] }) {
  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Publishing"
        description="Queue, scheduled posts, and publish history powered by the unified MarketingJob workflow."
      />

      <Card>
        <CardHeader>
          <CardTitle>Queue controls</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <form action={runMarketingJobsAction}>
            <Button type="submit">Run due jobs</Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Manual publish</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={enqueueManualPublishAction} className="grid gap-3 md:grid-cols-2">
            <input name="providerId" placeholder="Provider id (meta|linkedin)" className="rounded border px-3 py-2 text-sm" required />
            <input name="connectionId" placeholder="Connection id" className="rounded border px-3 py-2 text-sm" required />
            <input name="accountId" placeholder="Account / page id" className="rounded border px-3 py-2 text-sm" required />
            <input name="linkUrl" placeholder="Optional link URL" className="rounded border px-3 py-2 text-sm" />
            <textarea name="text" placeholder="Post text" className="md:col-span-2 min-h-24 rounded border px-3 py-2 text-sm" required />
            <Button type="submit" className="md:col-span-2 w-fit">Enqueue publish</Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent jobs</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {jobs.length === 0 ? (
            <p className="text-sm text-muted-foreground">No jobs yet.</p>
          ) : (
            jobs.map((job) => (
              <div key={job.id} className="rounded border px-3 py-2 text-sm">
                <div className="font-medium">
                  {job.jobType} · {job.status} · stage {job.workflowStage}
                </div>
                <div className="text-muted-foreground">
                  {job.providerId ?? "n/a"} · attempts {job.attemptCount} ·{" "}
                  {job.scheduledAt.toISOString()}
                </div>
                {job.lastError ? <div className="text-destructive">{job.lastError}</div> : null}
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
