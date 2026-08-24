import Link from "next/link";
import { AdminPageHeader } from "@/components/admin/layout/admin-shell";
import { seoWorkspaceService } from "@/features/seo/workspace/seo-workspace.service";
import { SeoSnapshotBanner } from "@/features/seo/workspace/components/seo-snapshot-banner";
import { SeoUnifiedScorePanel } from "@/features/seo/workspace/components/seo-unified-score-panel";
import { SeoDeveloperDetailsPanel } from "@/features/seo/workspace/components/seo-developer-details";
import { RunSiteAuditButton } from "@/features/seo/workspace/components/run-site-audit-button";

export async function SeoWorkspaceOverview({ snapshotId }: { snapshotId?: string }) {
  const overview = await seoWorkspaceService.getOverview(snapshotId);

  return (
    <div className="space-y-8">
      <AdminPageHeader
        title="SEO Health"
        description="Is your website healthy? Run a site audit, then review scores and issues."
        actions={<RunSiteAuditButton />}
      />

      <SeoSnapshotBanner snapshot={overview.snapshot} />

      {overview.score ? (
        <SeoUnifiedScorePanel
          score={overview.score}
          snapshotId={overview.snapshot?.id}
        />
      ) : (
        <p className="rounded-lg border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">
          No audit results yet. Click Run Site Audit to generate your first snapshot.
        </p>
      )}

      <div className="grid gap-3 sm:grid-cols-3">
        <Stat label="Critical" value={overview.issueCounts.critical} tone="critical" />
        <Stat label="Warnings" value={overview.issueCounts.warn} tone="warn" />
        <Stat label="Info" value={overview.issueCounts.info} tone="info" />
      </div>

      <div className="flex flex-wrap gap-3">
        <QuickLink href="/admin/seo/issues" label="Issues" />
        <QuickLink href="/admin/seo/technical" label="Technical Audit" />
        <QuickLink href="/admin/seo/content" label="Content Audit" />
        <QuickLink href="/admin/seo/autofill" label="Auto-fill" />
        <QuickLink href="/admin/seo/history" label="Audit History" />
      </div>

      <SeoDeveloperDetailsPanel details={overview.developer} />
    </div>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "critical" | "warn" | "info";
}) {
  const toneClass =
    tone === "critical"
      ? "border-red-200 bg-red-50 text-red-900"
      : tone === "warn"
        ? "border-amber-200 bg-amber-50 text-amber-950"
        : "border-slate-200 bg-slate-50 text-slate-800";
  return (
    <div className={`rounded-lg border px-4 py-3 ${toneClass}`}>
      <p className="text-xs uppercase tracking-wide opacity-80">{label}</p>
      <p className="text-2xl font-bold tabular-nums">{value}</p>
    </div>
  );
}

function QuickLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="rounded-md border px-3 py-2 text-sm font-medium hover:bg-muted/40"
    >
      {label}
    </Link>
  );
}
