import Link from "next/link";
import { AdminPageHeader } from "@/components/admin/layout/admin-shell";
import { seoWorkspaceService } from "@/features/seo/workspace/seo-workspace.service";
import { SeoDeveloperDetailsPanel } from "@/features/seo/workspace/components/seo-developer-details";
import { SEO_PIPELINE_VERSION } from "@/features/seo/workspace/types";

export default async function AdminSeoAuditHistoryPage() {
  const history = await seoWorkspaceService.listAuditHistory(30);
  const latest = history[0];

  return (
    <div className="space-y-8">
      <AdminPageHeader
        title="Audit History"
        description="Past site audit snapshots. Open one to view Overview, Technical Audit, or Issues for that run."
      />

      {history.length === 0 ? (
        <p className="rounded-lg border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">
          No audits yet.{" "}
          <Link href="/admin/seo" className="text-primary underline-offset-4 hover:underline">
            Run a site audit
          </Link>
          .
        </p>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="border-b bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-3 py-2 font-medium">Completed</th>
                <th className="px-3 py-2 font-medium">Score</th>
                <th className="px-3 py-2 font-medium">Issues</th>
                <th className="px-3 py-2 font-medium">Duration</th>
                <th className="px-3 py-2 font-medium">Snapshot</th>
                <th className="px-3 py-2 font-medium">Open</th>
              </tr>
            </thead>
            <tbody>
              {history.map((row) => (
                <tr key={row.id} className="border-b last:border-0">
                  <td className="px-3 py-2">
                    {new Date(row.completedAt).toLocaleString(undefined, {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                  </td>
                  <td className="px-3 py-2 tabular-nums font-medium">{row.overallScore}</td>
                  <td className="px-3 py-2 text-xs text-muted-foreground">
                    {row.issueCounts.critical}c / {row.issueCounts.warn}w / {row.issueCounts.info}i
                  </td>
                  <td className="px-3 py-2 tabular-nums">{Math.round(row.durationMs / 1000)}s</td>
                  <td className="px-3 py-2 font-mono text-xs">{row.id}</td>
                  <td className="px-3 py-2 space-x-2">
                    <Link
                      className="text-primary underline-offset-4 hover:underline"
                      href={`/admin/seo?snapshotId=${encodeURIComponent(row.id)}`}
                    >
                      Overview
                    </Link>
                    <Link
                      className="text-primary underline-offset-4 hover:underline"
                      href={`/admin/seo/technical?snapshotId=${encodeURIComponent(row.id)}`}
                    >
                      Technical
                    </Link>
                    <Link
                      className="text-primary underline-offset-4 hover:underline"
                      href={`/admin/seo/issues?snapshotId=${encodeURIComponent(row.id)}`}
                    >
                      Issues
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <SeoDeveloperDetailsPanel
        details={{
          analyzerIds: [],
          ruleIds: [],
          snapshotId: latest?.id,
          pipelineVersion: SEO_PIPELINE_VERSION,
        }}
      />
    </div>
  );
}
