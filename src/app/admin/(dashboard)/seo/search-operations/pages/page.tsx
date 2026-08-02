import { AdminPageHeader } from "@/components/admin/layout/admin-shell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getSearchOperationsPlatform } from "@/features/search-intelligence/workspaces/server";
import {
  ActionButton,
  ActionPanel,
  SearchOpsSubnav,
} from "@/features/search-intelligence/workspaces/ui";
import { enqueueSearchOperationAction } from "@/features/search-intelligence/workspaces/actions";

export const dynamic = "force-dynamic";

export default async function SearchOpsPagesWorkspace() {
  const platform = await getSearchOperationsPlatform();
  const url = `${platform.siteOrigin}/`;
  const inspector = platform.inspectUrl(url);
  const serp = platform.serpPreview({
    title: "Professional Two-Way Radio Solutions UAE",
    description:
      "BRT Trading supplies professional wireless communication equipment, DMR radios, and enterprise solutions across the UAE.",
    url,
    siteName: "BRT Trading LLC",
  });
  const impact = platform.simulateImpact({
    currentTitle: "Wireless Radio Supplier Dubai",
    proposedTitle: serp.title,
    currentDescription: "Supplier of radios.",
    proposedDescription: serp.description,
    schemaValid: true,
    improvesKnowledgeSignals: true,
  });
  const readiness = await platform.knowledgeReadiness();
  const serpTitle = serp.title;
  const serpDescription = serp.description;

  return (
    <div className="space-y-8 max-w-6xl">
      <AdminPageHeader
        title="Pages"
        description="URL-first SEO operations: inspect, preview SERP, simulate impact, request indexing."
      />
      <SearchOpsSubnav active="Pages" />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">URL Inspector — {url}</CardTitle>
          <CardDescription>Indexing, rich results, mobile, and CWV at a glance.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 text-sm">
          <div className="rounded-lg border p-3">Indexed: {inspector.indexed ? "Yes" : "No"}</div>
          <div className="rounded-lg border p-3">Last crawled: {inspector.lastCrawledLabel}</div>
          <div className="rounded-lg border p-3">Rich results: {inspector.richResults}</div>
          <div className="rounded-lg border p-3">CWV: {inspector.cwv}</div>
          <div className="rounded-lg border p-3">Canonical: {inspector.canonical}</div>
          <div className="rounded-lg border p-3">Breadcrumb: {inspector.breadcrumbValid ? "Valid" : "Invalid"}</div>
          <div className="rounded-lg border p-3">FAQ: {inspector.faqValid ? "Valid" : "Invalid"}</div>
          <div className="rounded-lg border p-3">Mobile: {inspector.mobileFriendly ? "Yes" : "No"}</div>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">SERP Preview</CardTitle>
            <CardDescription>Desktop snippet with truncation warnings.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="rounded-lg border bg-background p-4">
              <p className="text-xs text-emerald-700">{serp.displayUrl}</p>
              <p className="text-lg text-blue-700 dark:text-blue-400">{serp.title}</p>
              <p className="text-sm text-muted-foreground">{serp.description}</p>
            </div>
            <p className="text-xs text-muted-foreground">
              CTR prediction: {serp.ctrPrediction}
              {serp.warnings.length ? ` · Warnings: ${serp.warnings.join(", ")}` : ""}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Search Impact Simulation</CardTitle>
            <CardDescription>Predict effects before publish.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>CTR: {impact.predictedCtrDeltaPct >= 0 ? "+" : ""}{impact.predictedCtrDeltaPct}%</p>
            <p>Rich Results: {impact.richResultsEffect}</p>
            <p>Schema: {impact.schemaValid ? "Valid" : "Invalid"}</p>
            <p>Knowledge Impact: {impact.knowledgeImpact}</p>
            <p>Entity Confidence: {impact.entityConfidenceDeltaPct >= 0 ? "+" : ""}{impact.entityConfidenceDeltaPct}%</p>
            <p>Risk: {impact.risk}</p>
            <p className="text-muted-foreground">{impact.summary}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Knowledge Panel Readiness — {readiness.score}%</CardTitle>
          <CardDescription>
            Google decides Knowledge Panel visibility; this checklist tracks entity readiness signals.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {readiness.items.map((item) => (
            <div key={item.category} className="flex items-center justify-between gap-3 rounded-lg border p-3">
              <span>
                {item.category}{" "}
                <span className="text-xs uppercase text-muted-foreground">{item.status}</span>
              </span>
              <span className="text-xs text-muted-foreground">{item.actionLabel}</span>
            </div>
          ))}
        </CardContent>
      </Card>

      <ActionPanel title="Page actions">
        <ActionButton
          formAction={async () => {
            "use server";
            await enqueueSearchOperationAction({
              definitionId: "page.inspect_url",
              payload: { url },
              executeNow: true,
            });
          }}
        >
          Inspect URL
        </ActionButton>
        <ActionButton
          formAction={async () => {
            "use server";
            await enqueueSearchOperationAction({
              definitionId: "google.request_indexing",
              payload: { url },
              executeNow: true,
            });
          }}
        >
          Request Indexing
        </ActionButton>
        <ActionButton
          formAction={async () => {
            "use server";
            await enqueueSearchOperationAction({
              definitionId: "impact.simulate",
              payload: {
                currentTitle: "Wireless Radio Supplier Dubai",
                proposedTitle: serpTitle,
                proposedDescription: serpDescription,
              },
              executeNow: true,
            });
          }}
        >
          Simulate Impact
        </ActionButton>
        <ActionButton
          variant="outline"
          formAction={async () => {
            "use server";
            await enqueueSearchOperationAction({
              definitionId: "ai.apply_metadata",
              payload: { url, fields: { title: serpTitle, description: serpDescription } },
            });
          }}
        >
          Queue AI Metadata Apply
        </ActionButton>
      </ActionPanel>
    </div>
  );
}
