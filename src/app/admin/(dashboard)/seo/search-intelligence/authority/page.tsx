import { AdminPageHeader } from "@/components/admin/layout/admin-shell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getSearchIntelligenceOverview } from "@/features/search-intelligence/seo-consumer";
import { getSearchIntelligencePlatform } from "@/features/search-intelligence";
import { readPropertyValue } from "@/features/search-intelligence/entity-graph";

export const dynamic = "force-dynamic";

export default async function AdminAuthorityPage() {
  const overview = await getSearchIntelligenceOverview();
  const platform = getSearchIntelligencePlatform({ siteOrigin: overview.siteOrigin });
  const org = overview.organizations[0];

  const report = platform.authority(
    {
      backlinks: 0,
      brandMentions: 0,
      reviews: 0,
      averageRating: 0,
      socialActivity: 0,
      citations: 0,
      knowledgeSources: {
        wikipedia: false,
        wikidata: false,
        crunchbase: false,
        bing_places: false,
      },
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

  return (
    <div className="space-y-8 max-w-6xl">
      <AdminPageHeader
        title="Authority"
        description="Reputation signals, NAP consistency, and knowledge-source completeness."
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Authority score</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold tabular-nums">{report.score}/100</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">NAP consistent</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{report.napConsistent ? "Yes" : "No"}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Missing knowledge sources</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold tabular-nums">{report.missingKnowledgeSources.length}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Notes</CardTitle>
          <CardDescription>Connect Google Business Profile and citation sources to improve this score.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {report.notes.map((note) => (
            <p key={note} className="text-muted-foreground">
              {note}
            </p>
          ))}
          {report.napConflicts.map((conflict) => (
            <p key={conflict} className="text-amber-700 dark:text-amber-400">
              {conflict}
            </p>
          ))}
          {report.missingKnowledgeSources.length > 0 ? (
            <p className="text-muted-foreground">
              Missing: {report.missingKnowledgeSources.join(", ")}
            </p>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
