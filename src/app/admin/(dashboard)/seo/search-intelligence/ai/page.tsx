import { AdminPageHeader } from "@/components/admin/layout/admin-shell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getSearchIntelligenceOverview } from "@/features/search-intelligence/seo-consumer";
import { getSearchIntelligencePlatform } from "@/features/search-intelligence";

export const dynamic = "force-dynamic";

export default async function AdminAiAuditPage() {
  const overview = await getSearchIntelligenceOverview();
  const platform = getSearchIntelligencePlatform({ siteOrigin: overview.siteOrigin });

  const audit = platform.auditPage(
    {
      url: `${overview.siteOrigin}/`,
      title: "Homepage",
      description: "Search intelligence powered homepage description for entity SEO and rich results.",
      canonical: `${overview.siteOrigin}/`,
      h1s: ["Homepage"],
      internalLinks: ["/products", "/about"],
      wordCount: 220,
      imageAlts: [{ src: "/logo.png", alt: "Logo" }],
    },
    {
      searchIntentFit: 0.8,
      readability: 0.75,
      trust: 0.7,
      authority: 0.55,
      ctaQuality: 0.6,
      topicalCoverage: 0.5,
      semanticDepth: 0.55,
    },
  );

  return (
    <div className="space-y-8 max-w-6xl">
      <AdminPageHeader
        title="AI Audit"
        description="Stable scoring: 60% deterministic rules + 40% AI signals."
      />

      <div className="grid gap-4 sm:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Total</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold tabular-nums">{audit.total}/100</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Rules ({Math.round(audit.rulesWeight * 100)}%)</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold tabular-nums">{audit.rulesScore}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">AI ({Math.round(audit.aiWeight * 100)}%)</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold tabular-nums">{audit.aiScore}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Issues</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold tabular-nums">{audit.issues.length}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Suggested improvements</CardTitle>
          <CardDescription>Revisioned apply/rollback is available via the platform revision store.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {audit.suggestions.length === 0 ? (
            <p className="text-muted-foreground">No suggestions.</p>
          ) : (
            audit.suggestions.map((suggestion) => (
              <div key={suggestion} className="rounded-lg border p-3">
                {suggestion}
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
