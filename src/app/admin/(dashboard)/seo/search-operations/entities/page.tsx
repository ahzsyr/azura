import { AdminPageHeader } from "@/components/admin/layout/admin-shell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getSearchOperationsPlatform } from "@/features/search-intelligence/workspaces/server";
import { readPropertyValue } from "@/features/search-intelligence/entity-graph";
import {
  ActionButton,
  ActionPanel,
  SearchOpsSubnav,
} from "@/features/search-intelligence/workspaces/ui";
import {
  editEntityAction,
  enqueueSearchOperationAction,
} from "@/features/search-intelligence/workspaces/actions";

export const dynamic = "force-dynamic";

export default async function SearchOpsEntitiesWorkspace() {
  const platform = await getSearchOperationsPlatform();
  const entities = await platform.store.entities.list();
  const relationships = await platform.store.relationships.list();
  const org = entities.find((e) => e.type === "Organization") ?? null;
  const orgPublicId = org?.publicId ?? null;
  const mergeFromId = entities[1]?.publicId ?? null;
  const mergeToId = entities[0]?.publicId ?? null;
  const schema = await platform.buildSchema({
    pageUrl: `${platform.siteOrigin}/`,
    pageTitle: String(readPropertyValue(org ?? { properties: {}, slug: "org" } as never, "name") ?? "Organization"),
  });

  return (
    <div className="space-y-8 max-w-6xl">
      <AdminPageHeader
        title="Entities"
        description="Entity CMS: edit, validate, merge, sync, publish schema, and rollback."
      />
      <SearchOpsSubnav active="Entities" />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Entity catalog</CardTitle>
            <CardDescription>{entities.length} entities · {relationships.length} relationships</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {entities.length === 0 ? (
              <p className="text-muted-foreground">No entities synced yet.</p>
            ) : (
              entities.map((entity) => (
                <div key={entity.publicId} className="rounded-lg border p-3">
                  <p className="font-medium">
                    {String(readPropertyValue(entity, "name") ?? entity.slug)}{" "}
                    <span className="text-xs text-muted-foreground">{entity.type}</span>
                  </p>
                  <p className="font-mono text-xs text-muted-foreground">{entity.publicId}</p>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Schema preview</CardTitle>
            <CardDescription>
              v{schema.version} · {schema.shadowMode ? "shadow" : "live"} · {schema.issues.length} issues
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2 text-sm">
            {schema.graph["@graph"].map((node, i) => (
              <span key={`${String(node["@type"])}-${i}`} className="rounded-md border px-2 py-1">
                {String(node["@type"])}
              </span>
            ))}
          </CardContent>
        </Card>
      </div>

      <ActionPanel title="Entity & schema actions" description="Moderate edits execute now; publish/merge follow risk policy.">
        {orgPublicId ? (
          <ActionButton
            formAction={async () => {
              "use server";
              await editEntityAction({
                publicId: orgPublicId,
                fields: {
                  description:
                    "Professional supplier of two-way radios and wireless communication solutions in the UAE.",
                },
              });
            }}
          >
            Edit Organization Description
          </ActionButton>
        ) : null}
        <ActionButton
          formAction={async () => {
            "use server";
            await enqueueSearchOperationAction({
              definitionId: "entity.validate",
              payload: { publicId: orgPublicId },
              targetId: orgPublicId,
              executeNow: true,
            });
          }}
        >
          Validate Entity
        </ActionButton>
        <ActionButton
          formAction={async () => {
            "use server";
            await enqueueSearchOperationAction({
              definitionId: "schema.rebuild",
              executeNow: true,
            });
          }}
        >
          Rebuild Schema
        </ActionButton>
        <ActionButton
          variant="outline"
          formAction={async () => {
            "use server";
            await enqueueSearchOperationAction({
              definitionId: "schema.publish",
              forceApproval: true,
            });
          }}
        >
          Request Schema Publish
        </ActionButton>
        {mergeFromId && mergeToId ? (
          <ActionButton
            variant="destructive"
            formAction={async () => {
              "use server";
              await enqueueSearchOperationAction({
                definitionId: "entity.merge",
                payload: {
                  fromPublicId: mergeFromId,
                  toPublicId: mergeToId,
                },
                forceApproval: true,
              });
            }}
          >
            Request Entity Merge
          </ActionButton>
        ) : null}
      </ActionPanel>
    </div>
  );
}
