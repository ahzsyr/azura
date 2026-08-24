import Link from "next/link";
import { AdminPageHeader } from "@/components/admin/layout/admin-shell";
import { seoWorkspaceService } from "@/features/seo/workspace/seo-workspace.service";
import { SeoSnapshotBanner } from "@/features/seo/workspace/components/seo-snapshot-banner";
import { SeoIssuesTable } from "@/features/seo/workspace/components/seo-issues-table";
import { SeoDeveloperDetailsPanel } from "@/features/seo/workspace/components/seo-developer-details";
import type { SeoIssueCategory, SeoIssueSeverity, SeoIssueSource, SeoIssueStatus } from "@/features/seo/workspace/types";

type Props = {
  searchParams?: Promise<{
    snapshotId?: string;
    severity?: string;
    category?: string;
    source?: string;
    status?: string;
  }>;
};

function asSeverity(v?: string): SeoIssueSeverity | undefined {
  if (v === "critical" || v === "warn" || v === "info") return v;
  return undefined;
}

function asCategory(v?: string): SeoIssueCategory | undefined {
  if (
    v === "content" ||
    v === "metadata" ||
    v === "technical" ||
    v === "schema" ||
    v === "other"
  ) {
    return v;
  }
  return undefined;
}

function asSource(v?: string): SeoIssueSource | undefined {
  if (v === "crawl" || v === "validation" || v === "rule" || v === "recommendation") {
    return v;
  }
  return undefined;
}

function asStatus(v?: string): SeoIssueStatus | undefined {
  if (v === "open" || v === "resolved") return v;
  return undefined;
}

export default async function AdminSeoIssuesPage({ searchParams }: Props) {
  const params = searchParams ? await searchParams : {};
  const snapshotId = params.snapshotId;
  const filter = {
    severity: asSeverity(params.severity),
    category: asCategory(params.category),
    source: asSource(params.source),
    status: asStatus(params.status) ?? "open",
  };

  const [overview, issues] = await Promise.all([
    seoWorkspaceService.getOverview(snapshotId),
    seoWorkspaceService.listIssues(filter, snapshotId),
  ]);

  const base = "/admin/seo/issues";
  const withSnap = (qs: string) =>
    snapshotId
      ? `${base}?${qs}${qs ? "&" : ""}snapshotId=${encodeURIComponent(snapshotId)}`
      : `${base}${qs ? `?${qs}` : ""}`;

  return (
    <div className="space-y-8">
      <AdminPageHeader
        title="Issues"
        description="Canonical Issues from the site audit. Filter by severity, category, source, or status."
      />

      <SeoSnapshotBanner snapshot={overview.snapshot} />

      <div className="flex flex-wrap gap-2 text-sm">
        <FilterChip href={withSnap("")} label="All open" active={!params.severity && !params.category && !params.source} />
        <FilterChip href={withSnap("severity=critical")} label="Critical" active={params.severity === "critical"} />
        <FilterChip href={withSnap("severity=warn")} label="Warnings" active={params.severity === "warn"} />
        <FilterChip href={withSnap("category=technical")} label="Technical" active={params.category === "technical"} />
        <FilterChip href={withSnap("category=schema")} label="Schema" active={params.category === "schema"} />
        <FilterChip href={withSnap("category=content")} label="Content" active={params.category === "content"} />
        <FilterChip href={withSnap("category=metadata")} label="Metadata" active={params.category === "metadata"} />
        <FilterChip href={withSnap("source=recommendation")} label="Recommendations" active={params.source === "recommendation"} />
        <FilterChip href={withSnap("status=resolved")} label="Resolved" active={params.status === "resolved"} />
      </div>

      <SeoIssuesTable issues={issues} />

      <p className="text-xs text-muted-foreground">
        <Link href="/admin/seo" className="underline-offset-4 hover:underline">
          Back to Overview
        </Link>
      </p>

      <SeoDeveloperDetailsPanel details={overview.developer} />
    </div>
  );
}

function FilterChip({
  href,
  label,
  active,
}: {
  href: string;
  label: string;
  active: boolean;
}) {
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
