import Link from "next/link";
import { AdminPageHeader } from "@/components/admin/layout/admin-shell";
import { Button } from "@/components/ui/button";
import { RunSiteAuditButton } from "@/features/seo/workspace/components/run-site-audit-button";
import { SeoSetupCard } from "./seo-setup-card";
import type { SeoDashboardVm } from "../dashboard.service";
import { cn } from "@/lib/utils";

function formatWhen(value: string | null): string {
  if (!value) return "Not yet";
  return new Date(value).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

export function SeoOperatorDashboard({ vm }: { vm: SeoDashboardVm }) {
  const gradeLabel =
    vm.health.grade === "good" ? "Good" : vm.health.grade === "fair" ? "Fair" : vm.health.grade === "poor" ? "Needs work" : "Not audited";

  return (
    <div className="space-y-8 max-w-6xl">
      <AdminPageHeader
        title="SEO"
        description="Is search healthy, and what should you do today?"
        actions={<RunSiteAuditButton />}
      />

      <SeoSetupCard setup={vm.setup} />

      <section className="rounded-xl border p-5">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">SEO Health</p>
        <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-5xl font-bold tabular-nums">{vm.health.score ?? "—"}</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {vm.health.score != null ? `/ 100 · ${gradeLabel}` : "Run a site audit to see your score"}
            </p>
          </div>
          <p className="text-xs text-muted-foreground">Last audit: {formatWhen(vm.health.lastAuditAt)}</p>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <HealthStat label="Critical" value={vm.health.critical} tone="critical" />
          <HealthStat label="Warnings" value={vm.health.warnings} tone="warn" />
          <HealthStat label="Passed" value={vm.health.passed} tone="pass" />
        </div>
      </section>

      <section className="rounded-xl border p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Today</p>
            <p className="mt-2 text-sm">
              {vm.today.critical} critical · {vm.today.important} important · {vm.today.recommended} recommended
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button asChild>
              <Link href="/admin/seo/tasks/today">Start daily review</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/admin/seo/tasks?severity=critical">Fix critical issues</Link>
            </Button>
          </div>
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-xl border p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Search engines</p>
          <ul className="mt-3 space-y-2 text-sm">
            {vm.searchEngines.map((engine) => (
              <li key={engine.id} className="flex items-center justify-between">
                <span>{engine.label}</span>
                <span className={engine.connected ? "text-emerald-700" : "text-muted-foreground"}>
                  {engine.connected ? "Connected" : "Not connected"}
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-sm">
            {vm.pendingUrls} URL{vm.pendingUrls === 1 ? "" : "s"} waiting to be submitted
          </p>
          <div className="mt-3">
            <Button asChild variant="outline" size="sm">
              <Link href="/admin/seo/integrations">Submit URLs</Link>
            </Button>
          </div>
        </section>

        <section className="rounded-xl border p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Sitemap</p>
          <p className="mt-3 text-lg font-semibold">
            {vm.sitemap.healthy ? "Healthy" : "Needs attention"} — {vm.sitemap.urlCount.toLocaleString()} URLs
          </p>
          <p className="mt-1 text-sm text-muted-foreground">{vm.sitemap.fileCount} sitemap files</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button asChild variant="outline" size="sm">
              <Link href="/admin/seo/sitemap">View sitemap</Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link href="/admin/seo/integrations">Submit sitemap</Link>
            </Button>
          </div>
        </section>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <SummaryCard label="Content" value={`${vm.contentAttention} pages need attention`} href="/admin/seo/metadata" />
        <SummaryCard label="Technical SEO" value={`${vm.technicalCritical} critical issues`} href="/admin/seo/tasks?severity=critical" />
        <SummaryCard label="Structured data" value={`${vm.schemaWarnings} warnings`} href="/admin/seo/structured-data" />
      </div>

      <section className="rounded-xl border p-5">
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Recent SEO issues</p>
          <Link href="/admin/seo/tasks" className="text-sm text-primary hover:underline">
            View all issues
          </Link>
        </div>
        {vm.recentProblems.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">No open items. SEO looks clear.</p>
        ) : (
          <ul className="mt-3 divide-y">
            {vm.recentProblems.map((task) => (
              <li key={task.id} className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm">
                <div>
                  <p className="font-medium">{task.title}</p>
                  <p className="text-xs text-muted-foreground">{task.entity?.url ?? task.description}</p>
                </div>
                {task.action?.href ? (
                  <Link href={task.action.href} className="text-primary hover:underline">
                    {task.action.label}
                  </Link>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Quick actions</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button asChild variant="outline"><Link href="/admin/seo/audit">Run site audit</Link></Button>
          <Button asChild variant="outline"><Link href="/admin/seo/sitemap">Check sitemap</Link></Button>
          <Button asChild variant="outline"><Link href="/admin/seo/integrations">Check indexing</Link></Button>
          <Button asChild variant="outline"><Link href="/admin/seo/metadata">Review metadata</Link></Button>
          <Button asChild variant="outline"><Link href="/admin/seo/integrations">Submit URLs</Link></Button>
          <Button asChild variant="outline"><Link href="/admin/seo/templates">SEO settings</Link></Button>
        </div>
      </section>
    </div>
  );
}

function HealthStat({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "critical" | "warn" | "pass";
}) {
  return (
    <div
      className={cn(
        "rounded-lg border px-4 py-3",
        tone === "critical" && "border-red-200 bg-red-50 text-red-900",
        tone === "warn" && "border-amber-200 bg-amber-50 text-amber-950",
        tone === "pass" && "border-emerald-200 bg-emerald-50 text-emerald-900",
      )}
    >
      <p className="text-xs uppercase tracking-wide opacity-80">{label}</p>
      <p className="text-2xl font-bold tabular-nums">{value}</p>
    </div>
  );
}

function SummaryCard({ label, value, href }: { label: string; value: string; href: string }) {
  return (
    <Link href={href} className="rounded-xl border p-4 transition-colors hover:bg-muted/40">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-2 text-sm font-medium">{value}</p>
    </Link>
  );
}
