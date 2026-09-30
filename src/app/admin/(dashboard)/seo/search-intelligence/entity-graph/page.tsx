import { AdminPageHeader } from "@/components/admin/layout/admin-shell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getSearchIntelligenceOverview } from "@/features/search-intelligence/seo-consumer";
import {
  ENTITY_TYPES,
  RELATIONSHIP_TYPES,
  readPropertyValue,
} from "@/features/search-intelligence/entity-graph";
import { getSearchIntelligencePlatform } from "@/features/search-intelligence";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function AdminEntityGraphPage() {
  const overview = await getSearchIntelligenceOverview();
  const platform = getSearchIntelligencePlatform({ siteOrigin: overview.siteOrigin });
  const entities = await platform.store.entities.list();
  const relationships = await platform.store.relationships.list();

  return (
    <div className="space-y-8 max-w-6xl">
      <AdminPageHeader
        title="Entity Graph"
        description="Canonical entities and ontology relationships. Public IDs are immutable (entity://type/slug)."
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Entities</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold tabular-nums">{entities.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Relationships</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold tabular-nums">{relationships.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Ontology</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold tabular-nums">
              {ENTITY_TYPES.length}/{RELATIONSHIP_TYPES.length}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">types / edges</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Synced entities</CardTitle>
          <CardDescription>Database UUIDs are never exposed to schema or public APIs.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {entities.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No entities yet. Configure{" "}
              <Link href="/admin/company" className="text-primary hover:underline">
                Company Info
              </Link>{" "}
              and open the site homepage to sync.
            </p>
          ) : (
            entities.map((entity) => (
              <div key={entity.publicId} className="rounded-lg border p-3 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-medium">
                    {String(readPropertyValue(entity, "name") ?? entity.slug)}
                  </p>
                  <span className="text-xs text-muted-foreground">{entity.type}</span>
                </div>
                <p className="mt-1 font-mono text-xs text-muted-foreground">{entity.publicId}</p>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Relationships</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {relationships.length === 0 ? (
            <p className="text-muted-foreground">No relationships synced yet.</p>
          ) : (
            relationships.map((rel) => (
              <div key={rel.uuid} className="rounded-lg border p-3 font-mono text-xs">
                {rel.fromPublicId} —{rel.type}→ {rel.toPublicId}
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
