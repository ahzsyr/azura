import Link from "next/link";
import { AdminPageHeader } from "@/components/admin/layout/admin-shell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getSearchOperationsPlatform } from "@/features/search-intelligence/workspaces/server";
import {
  ActionButton,
  ActionPanel,
  SearchOpsSubnav,
} from "@/features/search-intelligence/workspaces/ui";
import { enqueueSearchOperationAction } from "@/features/search-intelligence/workspaces/actions";
import { readPropertyValue } from "@/features/search-intelligence/entity-graph";
import { operationResultHref } from "@/features/search-intelligence/operations/result-summary";

export const dynamic = "force-dynamic";

export default async function SearchOpsMonitoringWorkspace() {
  const platform = await getSearchOperationsPlatform();
  const issues = platform.issues.list().filter((i) => !i.resolvedAt);
  const org = (await platform.query.findByType("Organization"))[0];
  const authority = platform.authority(
    {
      backlinks: 12,
      brandMentions: 4,
      reviews: 3,
      averageRating: 4.2,
      citations: 2,
      knowledgeSources: { wikipedia: false, wikidata: false, crunchbase: false, bing_places: false },
    },
    org
      ? [
          {
            source: "company_profile",
            name: String(readPropertyValue(org, "name") ?? ""),
            phone: String(readPropertyValue(org, "phone") ?? ""),
            address: String(readPropertyValue(org, "address") ?? ""),
          },
        ]
      : [],
  );
  const latestPageSpeed = platform.operations
    .list()
    .find((op) => op.definitionId === "google.run_pagespeed" && op.status === "completed" && op.result);
  const cwvSample = {
    url: platform.siteOrigin,
    lcpMs:
      typeof latestPageSpeed?.result?.lcpMs === "number"
        ? latestPageSpeed.result.lcpMs
        : 3200,
    cls:
      typeof latestPageSpeed?.result?.cls === "number" ? latestPageSpeed.result.cls : 0.08,
    inpMs:
      typeof latestPageSpeed?.result?.inpMs === "number"
        ? latestPageSpeed.result.inpMs
        : 200,
  };
  const perf = platform.correlatePerformance(
    [cwvSample],
    [{ url: platform.siteOrigin, ctr: 0.02, averagePosition: 11, conversions: 4 }],
  );
  const siteOrigin = platform.siteOrigin;

  return (
    <div className="space-y-8 max-w-6xl">
      <AdminPageHeader
        title="Monitoring"
        description="Incidents across technical SEO, authority, performance, and crawls."
      />
      <SearchOpsSubnav active="Monitoring" />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Open incidents</CardTitle>
            <CardDescription>{issues.length} unresolved</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {issues.length === 0 ? (
              <p className="text-muted-foreground">No open technical issues.</p>
            ) : (
              issues.slice(0, 10).map((issue) => (
                <div key={issue.id} className="rounded-lg border p-3">
                  <p className="font-medium">
                    [{issue.severity}] {issue.title}
                  </p>
                  <p className="text-xs text-muted-foreground">{issue.message}</p>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Authority & performance</CardTitle>
            <CardDescription>
              Authority {authority.score}/100 · NAP {authority.napConsistent ? "consistent" : "drift"}
              {latestPageSpeed
                ? ` · PageSpeed Perf ${String(latestPageSpeed.result?.performanceScore ?? "—")}`
                : " · Run PageSpeed for live CWV"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {authority.notes.map((note) => (
              <p key={note} className="text-muted-foreground">
                {note}
              </p>
            ))}
            {latestPageSpeed?.result ? (
              <div className="rounded-lg border p-3">
                <p className="font-medium">Latest PageSpeed</p>
                <p className="text-xs text-muted-foreground">
                  LCP{" "}
                  {typeof latestPageSpeed.result.lcpMs === "number"
                    ? `${(latestPageSpeed.result.lcpMs / 1000).toFixed(1)}s`
                    : "—"}{" "}
                  · CLS {String(latestPageSpeed.result.cls ?? "—")} · Perf{" "}
                  {String(latestPageSpeed.result.performanceScore ?? "—")}
                </p>
                <Link
                  href={operationResultHref(latestPageSpeed.id)}
                  className="text-xs text-primary hover:underline"
                >
                  View result
                </Link>
              </div>
            ) : null}
            {perf.map((row) => (
              <div key={row.url} className="rounded-lg border p-3">
                <p className="font-medium">{row.risk.toUpperCase()} risk</p>
                <p className="text-xs text-muted-foreground">{row.note}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <ActionPanel title="Monitoring actions">
        <ActionButton
          formAction={async () => {
            "use server";
            return enqueueSearchOperationAction({
              definitionId: "google.run_pagespeed",
              payload: { url: siteOrigin },
              executeNow: true,
            });
          }}
        >
          Run Performance Scan
        </ActionButton>
        <ActionButton
          formAction={async () => {
            "use server";
            return enqueueSearchOperationAction({
              definitionId: "entity.validate",
              executeNow: true,
            });
          }}
        >
          Validate NAP / Entity
        </ActionButton>
      </ActionPanel>
    </div>
  );
}
