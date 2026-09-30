import Link from "next/link";
import { AdminPageHeader } from "@/components/admin/layout/admin-shell";
import { seoWorkspaceService } from "@/features/seo/workspace/seo-workspace.service";
import { SeoSnapshotBanner } from "@/features/seo/workspace/components/seo-snapshot-banner";
import { SeoUnifiedScorePanel } from "@/features/seo/workspace/components/seo-unified-score-panel";
import { SeoDeveloperDetailsPanel } from "@/features/seo/workspace/components/seo-developer-details";
import { RunSiteAuditButton } from "@/features/seo/workspace/components/run-site-audit-button";
import { SeoIssuesTable } from "@/features/seo/workspace/components/seo-issues-table";
import type { SeoIssueSeverity } from "@/features/seo/workspace/types";

type Props = {
  searchParams?: Promise<{ snapshotId?: string; tab?: string }>;
};

function asTab(v?: string): "all" | SeoIssueSeverity | "passed" {
  if (v === "critical" || v === "warn" || v === "info" || v === "passed") return v;
  return "all";
}

export default async function AdminSeoSiteAuditPage({ searchParams }: Props) {
  const params = searchParams ? await searchParams : {};
  const snapshotId = params.snapshotId;
  const tab = asTab(params.tab);

  const [overview, issues, technical] = await Promise.all([
    seoWorkspaceService.getOverview(snapshotId),
    seoWorkspaceService.listIssues({ status: "open" }, snapshotId),
    seoWorkspaceService.getTechnicalAudit(snapshotId),
  ]);

  const passedCards = technical.cards.filter((card) => card.status === "healthy");
  const visibleIssues =
    tab === "all"
      ? issues
      : tab === "passed"
        ? []
        : issues.filter((issue) => issue.severity === tab);

  const withSnap = (tabId: string) => {
    const qs = new URLSearchParams();
    if (tabId !== "all") qs.set("tab", tabId);
    if (snapshotId) qs.set("snapshotId", snapshotId);
    const query = qs.toString();
    return query ? `/admin/seo/audit?${query}` : "/admin/seo/audit";
  };

  return (
    <div className="space-y-8">
      <AdminPageHeader
        title="Site Audit"
        description="What is wrong, and what already looks healthy."
        actions={<RunSiteAuditButton />}
      />

      <SeoSnapshotBanner snapshot={overview.snapshot} />

      {overview.score ? (
        <SeoUnifiedScorePanel
          score={overview.score}
          snapshotId={overview.snapshot?.id}
          issuesBaseHref="/admin/seo/tasks"
        />
      ) : (
        <p className="rounded-lg border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">
          No audit results yet. Run a site audit to generate your first report.
        </p>
      )}

      <div className="flex flex-wrap gap-2 text-sm">
        <TabChip href={withSnap("all")} label="All" active={tab === "all"} />
        <TabChip href={withSnap("critical")} label={`Critical (${overview.issueCounts.critical})`} active={tab === "critical"} />
        <TabChip href={withSnap("warn")} label={`Warnings (${overview.issueCounts.warn})`} active={tab === "warn"} />
        <TabChip href={withSnap("passed")} label={`Passed (${passedCards.length})`} active={tab === "passed"} />
      </div>

      {tab === "passed" ? (
        <ul className="grid gap-3 sm:grid-cols-2">
          {passedCards.map((card) => (
            <li key={card.id} className="rounded-lg border border-emerald-200 p-4">
              <p className="font-medium">{card.label}</p>
              <p className="mt-1 text-sm text-muted-foreground">{card.summary}</p>
            </li>
          ))}
        </ul>
      ) : (
        <SeoIssuesTable issues={visibleIssues} />
      )}

      <p className="text-xs text-muted-foreground">
        <Link href="/admin/seo" className="underline-offset-4 hover:underline">
          Back to Dashboard
        </Link>
      </p>

      <SeoDeveloperDetailsPanel details={overview.developer} />
    </div>
  );
}

function TabChip({ href, label, active }: { href: string; label: string; active: boolean }) {
  return (
    <Link
      href={href}
      className={
        active
          ? "rounded-md border border-foreground bg-foreground px-3 py-1.5 text-background"
          : "rounded-md border px-3 py-1.5 hover:bg-muted/40"
      }
    >
      {label}
    </Link>
  );
}
