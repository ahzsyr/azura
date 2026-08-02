import { AdminPageHeader } from "@/components/admin/layout/admin-shell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getSearchOperationsPlatform } from "@/features/search-intelligence/workspaces/server";
import {
  ActionButton,
  ActionPanel,
  KpiCard,
  SearchOpsSubnav,
} from "@/features/search-intelligence/workspaces/ui";
import {
  approveNextWaitingOperationAction,
  enqueueSearchOperationAction,
} from "@/features/search-intelligence/workspaces/actions";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function SearchOpsOverviewPage() {
  const platform = await getSearchOperationsPlatform();
  const center = await platform.commandCenter();
  const siteOrigin = platform.siteOrigin;

  return (
    <div className="space-y-8 max-w-6xl">
      <AdminPageHeader
        title="Search Operations"
        description="Command center for SEO health, approvals, and recommended next actions."
      />
      <SearchOpsSubnav active="Overview" />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Search Health" value={`${center.healthScore}%`} />
        <KpiCard label="Critical Issues" value={center.criticalIssues} />
        <KpiCard label="Warnings" value={center.warnings} />
        <KpiCard
          label="Automation"
          value={center.automationHealthy ? "Healthy" : "Attention"}
        />
        <KpiCard label="Last Crawl" value={center.lastCrawlLabel} />
        <KpiCard label="URLs Indexed" value={center.urlsIndexed} />
        <KpiCard label="Rich Results" value={`${center.richResultsPct}%`} />
        <KpiCard label="Knowledge Readiness" value={`${center.knowledgeReadiness}%`} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Running" value={center.queue.running} />
        <KpiCard label="Waiting Approval" value={center.queue.waiting_approval} />
        <KpiCard label="Queued" value={center.queue.queued} />
        <KpiCard label="Failed" value={center.queue.failed} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recommended Next Actions</CardTitle>
          <CardDescription>State + impact + what you can do now.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {center.recommended.map((item) => {
            const definitionId = item.definitionId;
            const executeNow = definitionId !== "ai.apply_metadata";
            return (
              <div key={item.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3">
                <div>
                  <p className="font-medium">{item.label}</p>
                  <p className="text-xs text-muted-foreground">{item.reason}</p>
                </div>
                <div className="flex gap-2">
                  {item.href ? (
                    <Link href={item.href} className="text-sm text-primary hover:underline">
                      Open
                    </Link>
                  ) : null}
                  <ActionButton
                    formAction={async () => {
                      "use server";
                      await enqueueSearchOperationAction({
                        definitionId,
                        payload: {},
                        executeNow,
                      });
                    }}
                  >
                    Run
                  </ActionButton>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      <ActionPanel
        title="Quick operations"
        description="Safe actions execute immediately; moderate/high follow approval policy."
      >
        <ActionButton
          formAction={async () => {
            "use server";
            await enqueueSearchOperationAction({
              definitionId: "schema.rebuild",
              executeNow: true,
            });
          }}
        >
          Rebuild Schema
        </ActionButton>
        <ActionButton
          formAction={async () => {
            "use server";
            await enqueueSearchOperationAction({
              definitionId: "google.request_indexing",
              payload: { url: siteOrigin },
              executeNow: true,
            });
          }}
        >
          Request Homepage Index
        </ActionButton>
        <ActionButton variant="outline" formAction={approveNextWaitingOperationAction}>
          Approve Next Waiting
        </ActionButton>
      </ActionPanel>
    </div>
  );
}
