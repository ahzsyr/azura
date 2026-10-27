import { AdminPageHeader } from "@/components/admin/layout/admin-shell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getSearchIntelligenceOverview } from "@/features/search-intelligence/seo-consumer";
import { getPageTargetsWorkspaceAction } from "@/features/search-intelligence/content-intelligence/actions";
import { PageTargetsPanel } from "@/features/search-intelligence/content-intelligence/page-targets-panel";
import { buildSeoReadinessChecklist } from "@/features/seo/quality/seo-readiness-checklist";

export const dynamic = "force-dynamic";

export default async function AdminContentIntelligencePage() {
  const [overview, workspace, readiness] = await Promise.all([
    getSearchIntelligenceOverview(),
    getPageTargetsWorkspaceAction(),
    buildSeoReadinessChecklist(),
  ]);

  return (
    <div className="space-y-8 max-w-6xl">
      <AdminPageHeader
        title="Content Intelligence"
        description="Assign site-scoped search targets, review topic ownership, and detect content gaps."
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">SEO readiness checklist</CardTitle>
          <CardDescription>
            Operator status signals only — not a ranking score. Site {readiness.siteKey}.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {readiness.items.map((item) => (
            <div key={item.id} className="rounded-lg border p-3 flex items-start justify-between gap-3">
              <div>
                <p className="font-medium">{item.label}</p>
                <p className="text-xs text-muted-foreground">{item.detail}</p>
              </div>
              <span className="text-xs uppercase tracking-wide text-muted-foreground shrink-0">
                {item.status}
              </span>
            </div>
          ))}
        </CardContent>
      </Card>

      <PageTargetsPanel
        siteKey={workspace.siteKey}
        locales={workspace.locales}
        config={workspace.config}
        ownershipFindings={workspace.ownershipFindings}
        keywordAssignmentFindings={workspace.keywordAssignmentFindings}
        unassignedByLocale={workspace.unassignedByLocale}
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Content gaps</CardTitle>
            <CardDescription>Missing intents ranked by impact.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {overview.contentGaps.length === 0 ? (
              <p className="text-muted-foreground">
                Ingest products, solutions, and articles to populate topic clusters.
              </p>
            ) : (
              overview.contentGaps.map((gap) => (
                <div key={gap.topic} className="rounded-lg border p-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-medium">{gap.topic}</p>
                    <span className="text-xs tabular-nums text-muted-foreground">
                      impact {(gap.impact * 100).toFixed(0)}%
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Missing: {gap.missingIntents.join(", ")}
                  </p>
                  <ul className="mt-2 list-disc pl-4 text-xs text-muted-foreground">
                    {gap.suggestedTitles.slice(0, 3).map((title) => (
                      <li key={title}>{title}</li>
                    ))}
                  </ul>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Cannibalization</CardTitle>
            <CardDescription>Pages competing for overlapping intent.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {overview.cannibalization.length === 0 ? (
              <p className="text-muted-foreground">No cannibalization signals detected.</p>
            ) : (
              overview.cannibalization.map((item) => (
                <div key={`${item.a}-${item.b}`} className="rounded-lg border p-3">
                  <p className="font-mono text-xs">{item.a}</p>
                  <p className="font-mono text-xs">{item.b}</p>
                  <p className="mt-1 text-muted-foreground">{item.reason}</p>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
