import Link from "next/link";
import { AdminPageHeader } from "@/components/admin/layout/admin-shell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getSearchOperationsPlatform } from "@/features/search-intelligence/workspaces/server";
import { ActionButton, KpiCard, SearchOpsSubnav } from "@/features/search-intelligence/workspaces/ui";
import {
  approveSearchOperationAction,
  rejectSearchOperationAction,
  undoSearchOperationAction,
} from "@/features/search-intelligence/workspaces/actions";
import {
  operationResultHref,
  summarizeOperationResult,
} from "@/features/search-intelligence/operations/result-summary";

export const dynamic = "force-dynamic";

export default async function SearchOpsOperationsPage() {
  const platform = await getSearchOperationsPlatform();
  const center = platform.actionCenter();

  return (
    <div className="space-y-8 max-w-6xl">
      <AdminPageHeader
        title="Operations"
        description="Global queue for running, queued, waiting approval, scheduled, completed, and failed work."
      />
      <SearchOpsSubnav active="Queue" />

      <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-6">
        <KpiCard label="Running" value={center.counts.running} />
        <KpiCard label="Queued" value={center.counts.queued} />
        <KpiCard label="Waiting Approval" value={center.counts.waiting_approval} />
        <KpiCard label="Scheduled" value={center.counts.scheduled} />
        <KpiCard label="Completed" value={center.counts.completed} />
        <KpiCard label="Failed" value={center.counts.failed} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Queue</CardTitle>
          <CardDescription>Assign, approve, reject, execute, and undo from one board.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {center.recent.length === 0 ? (
            <p className="text-sm text-muted-foreground">No operations yet. Run an action from Overview.</p>
          ) : (
            center.recent.map((op) => {
              const opId = op.id;
              const summary = summarizeOperationResult(op);
              return (
                <div key={op.id} className="rounded-lg border p-3">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="font-medium">
                        {op.label}{" "}
                        <span className="text-xs uppercase tracking-wide text-muted-foreground">
                          {op.status}
                        </span>
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {op.risk} · {op.category} · {op.environment}
                        {op.targetLabel ? ` · ${op.targetLabel}` : ""}
                      </p>
                      <p className="text-xs mt-1">{summary}</p>
                      <Link
                        href={operationResultHref(opId)}
                        className="text-xs text-primary hover:underline"
                      >
                        View result
                      </Link>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {op.status === "waiting_approval" ? (
                        <>
                          <ActionButton
                            formAction={async () => {
                              "use server";
                              return approveSearchOperationAction(opId);
                            }}
                          >
                            Approve
                          </ActionButton>
                          <ActionButton
                            variant="outline"
                            formAction={async () => {
                              "use server";
                              return rejectSearchOperationAction(opId);
                            }}
                          >
                            Reject
                          </ActionButton>
                        </>
                      ) : null}
                      {op.checkpointId && op.status === "completed" ? (
                        <ActionButton
                          variant="secondary"
                          formAction={async () => {
                            "use server";
                            return undoSearchOperationAction(opId);
                          }}
                        >
                          Undo
                        </ActionButton>
                      ) : null}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>
    </div>
  );
}
