import { AdminPageHeader } from "@/components/admin/layout/admin-shell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getSearchIntelligenceOverview } from "@/features/search-intelligence/seo-consumer";
import { getSearchIntelligencePlatform } from "@/features/search-intelligence";
import { summarizeLinkHealth } from "@/features/search-intelligence/internal-linking";

export const dynamic = "force-dynamic";

export default async function AdminInternalLinkingPage() {
  const overview = await getSearchIntelligenceOverview();
  const platform = getSearchIntelligencePlatform({ siteOrigin: overview.siteOrigin });
  const org = overview.organizations[0];

  const metrics = org ? await platform.metricsFor(org.publicId) : null;
  const recommendations = org ? await platform.recommendLinks(org.publicId) : [];
  const notes = org && metrics ? summarizeLinkHealth(metrics, org) : [];

  return (
    <div className="space-y-8 max-w-6xl">
      <AdminPageHeader
        title="Internal Linking"
        description="Graph metrics and intelligent link recommendations from entity relationships."
      />

      {metrics ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            ["PageRank", metrics.pageRank.toFixed(3)],
            ["Authority", metrics.authorityScore.toFixed(3)],
            ["In / Out", `${metrics.inDegree} / ${metrics.outDegree}`],
            ["Link depth", String(metrics.internalLinkDepth)],
          ].map(([label, value]) => (
            <Card key={label}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">{label}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold tabular-nums">{value}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">Sync an organization entity to compute linking metrics.</p>
      )}

      {notes.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Health notes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {notes.map((note) => (
              <p key={note} className="text-muted-foreground">
                {note}
              </p>
            ))}
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recommendations</CardTitle>
          <CardDescription>Suggested edges based on ontology and graph shape.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {recommendations.length === 0 ? (
            <p className="text-muted-foreground">No recommendations yet.</p>
          ) : (
            recommendations.map((rec) => (
              <div key={`${rec.fromPublicId}-${rec.toPublicId}`} className="rounded-lg border p-3">
                <p className="font-medium">{rec.toPublicId}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  score {rec.score.toFixed(2)} · {rec.reason}
                </p>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
