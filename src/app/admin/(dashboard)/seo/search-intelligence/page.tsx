import { AdminPageHeader } from "@/components/admin/layout/admin-shell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getSearchIntelligenceOverview } from "@/features/search-intelligence/seo-consumer";
import { ENTITY_TYPES, RELATIONSHIP_TYPES } from "@/features/search-intelligence/entity-graph";
import type { ContentGap } from "@/features/search-intelligence/content-intelligence";
import type { ConnectorHealth, GraphEntity } from "@/features/search-intelligence/types";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function AdminSearchIntelligencePage() {
  const overview = await getSearchIntelligenceOverview();

  return (
    <div className="space-y-8 max-w-6xl">
      <AdminPageHeader
        title="Search Intelligence"
        description="Shared entity graph platform powering SEO, schema, linking, AI, and authority systems."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Entities</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold tabular-nums">{overview.entityCount}</p>
            <p className="mt-1 text-xs text-muted-foreground">{overview.entityTypes.join(", ") || "None synced"}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Relationships</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold tabular-nums">{overview.relationshipCount}</p>
            <p className="mt-1 text-xs text-muted-foreground">Ontology-backed edges</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Open issues</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold tabular-nums">{overview.dashboard.openIssues}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {overview.dashboard.issueCounts.critical} critical · {overview.dashboard.issueCounts.warn} warn
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Connectors ready</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold tabular-nums">
              {overview.connectors.filter((c: ConnectorHealth) => c.ok).length}/{overview.connectors.length}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">Shared connector lifecycle</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Organization graph</CardTitle>
            <CardDescription>
              Synced from company profile into immutable public entity IDs.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {overview.organizations.length === 0 ? (
              <p className="text-muted-foreground">No organization entity yet. Configure company profile first.</p>
            ) : (
              overview.organizations.map((org: GraphEntity) => (
                <div key={org.publicId} className="rounded-lg border p-3">
                  <p className="font-medium">
                    {String((org.properties.name as { value?: unknown } | undefined)?.value ?? org.slug)}
                  </p>
                  <p className="mt-1 font-mono text-xs text-muted-foreground">{org.publicId}</p>
                  <p className="mt-1 text-xs text-muted-foreground">Internal UUID hidden from schema APIs</p>
                </div>
              ))
            )}
            <p className="text-xs text-muted-foreground">
              Site origin: <span className="font-mono">{overview.siteOrigin}</span>
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Content intelligence</CardTitle>
            <CardDescription>Topic gaps and cannibalization signals from the graph.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {overview.contentGaps.length === 0 ? (
              <p className="text-muted-foreground">
                No content gaps detected yet. Ingest products and articles to populate clusters.
              </p>
            ) : (
              overview.contentGaps.slice(0, 5).map((gap: ContentGap) => (
                <div key={gap.topic} className="rounded-lg border p-3">
                  <p className="font-medium">{gap.topic}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Missing: {gap.missingIntents.join(", ")}
                  </p>
                </div>
              ))
            )}
            {overview.cannibalization.slice(0, 3).map((item: { a: string; b: string; reason: string }) => (
              <p key={`${item.a}-${item.b}`} className="text-xs text-amber-700 dark:text-amber-400">
                {item.reason}
              </p>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Platform modules</CardTitle>
          <CardDescription>
            Ontology includes {ENTITY_TYPES.length} entity types and {RELATIONSHIP_TYPES.length} relationship types.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 text-sm">
          {[
            ["/admin/seo/search-intelligence/entity-graph", "Entity Graph", "Canonical IDs, ontology, confidence, policy engine"],
            ["/admin/seo/search-intelligence/schema", "Schema Graph", "Graph-backed JSON-LD with shadow parity vs SEO pipeline"],
            ["/admin/seo/search-intelligence/linking", "Internal Linking", "Graph metrics and recommendations"],
            ["/admin/seo/search-intelligence/content", "Content Intelligence", "Topic clusters, gaps, cannibalization"],
            ["/admin/seo/search-intelligence/authority", "Authority", "NAP drift, reviews, knowledge sources"],
            ["/admin/seo/search-intelligence/performance", "Performance SEO", "CWV ↔ CTR correlation"],
            ["/admin/seo/search-intelligence/ai", "AI Audit", "60% rules + 40% AI scoring"],
          ].map(([href, title, description]) => (
            <Link key={href} href={href} className="rounded-lg border p-3 transition-colors hover:bg-muted/40">
              <p className="font-medium">{title}</p>
              <p className="mt-1 text-xs text-muted-foreground">{description}</p>
            </Link>
          ))}
        </CardContent>
      </Card>

      <p className="text-sm text-muted-foreground">
        SEO remains a consumer of this graph. Manage delivery settings in{" "}
        <Link href="/admin/seo/structured-data" className="text-primary hover:underline">
          Structured Data
        </Link>
        ,{" "}
        <Link href="/admin/seo/google" className="text-primary hover:underline">
          Google
        </Link>
        , and{" "}
        <Link href="/admin/seo" className="text-primary hover:underline">
          SEO Workspace
        </Link>
        .
      </p>
    </div>
  );
}
