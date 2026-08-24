import { AdminPageHeader } from "@/components/admin/layout/admin-shell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getSearchIntelligenceOverview } from "@/features/search-intelligence/seo-consumer";
import {
  createSearchIntelligencePlatform,
  buildGraphBackedSchema,
} from "@/features/search-intelligence";

export const dynamic = "force-dynamic";

export default async function AdminSchemaGraphPage() {
  const overview = await getSearchIntelligenceOverview();
  const platform = createSearchIntelligencePlatform({ siteOrigin: overview.siteOrigin });
  await platform.ingestSourceRecords(
    overview.organizations.map((org) => ({
      source: "company_profile" as const,
      sourceKey: `reseed:${org.slug}`,
      entityType: "Organization" as const,
      slug: org.slug,
      properties: Object.fromEntries(
        Object.entries(org.properties).map(([key, meta]) => [
          key,
          meta && typeof meta === "object" && "value" in meta ? meta.value : meta,
        ]),
      ),
    })),
  );

  const result = await buildGraphBackedSchema({
    store: platform.store,
    query: platform.query,
    siteOrigin: overview.siteOrigin,
    pageUrl: `${overview.siteOrigin}/`,
    pageTitle: "Homepage",
    pageDescription: "Graph-backed schema preview",
    locale: "en",
  });

  return (
    <div className="space-y-8 max-w-6xl">
      <AdminPageHeader
        title="Schema Graph"
        description="Graph-backed JSON-LD builders with semantic validation and shadow-mode version flags."
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Version</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold tabular-nums">v{result.version}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {result.shadowMode ? "Shadow mode" : "Production"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Nodes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold tabular-nums">{result.graph["@graph"].length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Validation issues</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold tabular-nums">{result.issues.length}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Emitted types</CardTitle>
          <CardDescription>Production HTML still uses the SEO SchemaPipeline; this preview is graph-backed.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2 text-sm">
          {result.graph["@graph"].map((node, index) => (
            <span key={`${String(node["@type"])}-${index}`} className="rounded-md border px-2 py-1">
              {String(node["@type"])}
            </span>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Validation</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {result.issues.length === 0 ? (
            <p className="text-muted-foreground">No schema validation issues.</p>
          ) : (
            result.issues.map((issue) => (
              <div key={`${issue.code}-${issue.message}`} className="rounded-lg border p-3">
                <p className="font-medium">
                  [{issue.level}] {issue.code}
                </p>
                <p className="mt-1 text-muted-foreground">{issue.message}</p>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
