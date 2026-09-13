import Link from "next/link";
import { Button } from "@/components/ui/button";
import type { SeoTask } from "../types";
import type { SeoDashboardVm } from "../dashboard.service";

function weekLabel() {
  const now = new Date();
  const start = new Date(now);
  start.setDate(now.getDate() - now.getDay() + 1);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  const fmt = (d: Date) => d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  return `${fmt(start)}–${fmt(end)}`;
}

export function SeoWeeklyReview({ tasks, dashboard }: { tasks: SeoTask[]; dashboard: SeoDashboardVm }) {
  const open = tasks.filter((task) => task.status === "open");
  const content = open.filter((task) => task.category === "content" || task.type === "metadata");
  const recommended = open.filter((task) => task.severity !== "critical").slice(0, 5);

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="rounded-xl border p-5">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Weekly SEO review</p>
        <p className="mt-1 text-sm text-muted-foreground">Week of {weekLabel()}</p>
        <dl className="mt-4 space-y-2 text-sm">
          <Row label="Technical health" value={dashboard.technicalCritical === 0 ? "No critical crawl errors" : `${dashboard.technicalCritical} critical issues`} ok={dashboard.technicalCritical === 0} />
          <Row label="Content" value={`${content.length} pages need optimization`} ok={content.length === 0} />
          <Row label="Indexing" value={dashboard.failedSubmissions === 0 ? "Submissions healthy" : `${dashboard.failedSubmissions} failed`} ok={dashboard.failedSubmissions === 0} />
          <Row label="Sitemap" value={dashboard.sitemap.healthy ? "Healthy" : "Needs attention"} ok={dashboard.sitemap.healthy} />
          <Row label="Schema" value={dashboard.schemaWarnings === 0 ? "No critical errors" : `${dashboard.schemaWarnings} warnings`} ok={dashboard.schemaWarnings === 0} />
        </dl>
      </div>

      <div className="rounded-xl border p-5">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Recommended this week</p>
        {recommended.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">No extra work queued. Keep monitoring the dashboard.</p>
        ) : (
          <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm">
            {recommended.map((task) => (
              <li key={task.id}>{task.title}</li>
            ))}
          </ol>
        )}
        <div className="mt-4">
          <Button asChild>
            <Link href="/admin/seo/tasks/today">Start weekly review</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, ok }: { label: string; value: string; ok: boolean }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className={ok ? "text-emerald-800" : "text-amber-800"}>{ok ? `✓ ${value}` : `⚠ ${value}`}</dd>
    </div>
  );
}
