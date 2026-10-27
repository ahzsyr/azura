import { AdminPageHeader } from "@/components/admin/layout/admin-shell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { buildTargetGscCompareReport } from "@/features/seo/analytics/target-gsc-compare.service";

export const dynamic = "force-dynamic";

export default async function AdminPerformanceSeoPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = (await searchParams) ?? {};
  const daysRaw = typeof params.days === "string" ? Number(params.days) : 28;
  const days = Number.isFinite(daysRaw) && daysRaw > 0 ? Math.min(daysRaw, 90) : 28;
  const country = typeof params.country === "string" ? params.country : undefined;
  const device = typeof params.device === "string" ? params.device : undefined;

  const report = await buildTargetGscCompareReport({ days, country, device });

  return (
    <div className="space-y-8 max-w-6xl">
      <AdminPageHeader
        title="Performance SEO"
        description="Compare declared page search targets with observed GSC query/page data (no search-type filter in v1)."
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Report scope</CardTitle>
          <CardDescription>
            Site {report.siteKey}
            {report.gscPropertyLabel ? ` · GSC property ${report.gscPropertyLabel}` : " · GSC property not configured"}
            {" · "}
            last {report.dateRangeDays} days
            {report.freshness ? ` · freshness ${report.freshness}` : ""}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          {report.caveats.map((caveat) => (
            <p key={caveat}>• {caveat}</p>
          ))}
          {(country || device) && (
            <p>
              Active filters:
              {country ? ` country=${country}` : ""}
              {device ? ` device=${device}` : ""}
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Opportunities</CardTitle>
          <CardDescription>High impressions with topic mismatch or unmatched URLs.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {report.opportunities.length === 0 ? (
            <p className="text-muted-foreground">No prioritized opportunities in this window.</p>
          ) : (
            report.opportunities.map((item) => (
              <div key={`${item.kind}-${item.label}`} className="rounded-lg border p-3">
                <p className="font-medium">{item.label}</p>
                <p className="text-xs text-muted-foreground">
                  {item.kind} · {item.impressions} impressions
                </p>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Targets vs observed</CardTitle>
          <CardDescription>Canonical URLs derived via the SEO URL layer — not stored free-text URLs.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {report.targets.length === 0 ? (
            <p className="text-muted-foreground">
              No draft/active page search targets. Assign targets under Content Intelligence.
            </p>
          ) : (
            report.targets.map((row) => (
              <div key={row.targetId} className="rounded-lg border p-3 space-y-1">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-medium">{row.primaryTopic}</p>
                  <span className="text-xs uppercase tracking-wide text-muted-foreground">
                    {row.status}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {row.entityType}:{row.entityId} · {row.locale}
                </p>
                <p className="font-mono text-xs break-all">{row.canonicalUrl}</p>
                <p className="text-xs text-muted-foreground">
                  impr {row.impressions} · clicks {row.clicks} · CTR{" "}
                  {(row.ctr * 100).toFixed(2)}% · pos {row.averagePosition.toFixed(1)}
                  {row.topicQueryOverlap ? " · topic overlap" : " · weak topic overlap"}
                </p>
                {row.topQueries.length > 0 ? (
                  <p className="text-xs text-muted-foreground">
                    Queries: {row.topQueries.map((q) => q.query).join(", ")}
                  </p>
                ) : null}
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Unmatched GSC URLs</CardTitle>
          <CardDescription>
            Observed pages with no matching target (reported, not silently dropped).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {report.unmatchedUrls.length === 0 ? (
            <p className="text-muted-foreground">No unmatched URLs above the impression threshold.</p>
          ) : (
            report.unmatchedUrls.map((row) => (
              <div key={row.url} className="rounded-lg border p-3">
                <p className="font-mono text-xs break-all">{row.url}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  impr {row.impressions} · clicks {row.clicks}
                  {row.topQueries.length ? ` · ${row.topQueries.join(", ")}` : ""}
                </p>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
