import { DataPlatformConsole } from "@/features/data-platform/components/data-platform-console";
import { platformService } from "@/features/data-platform/services/platform.service";
import { getDeploymentProfile } from "@/config/deployment-profile";
import { toClientSourceMetaList } from "@/features/data-platform/registry/to-client-meta";

export default async function DatabaseAdminPage() {
  const profile = getDeploymentProfile();
  let overview: Awaited<ReturnType<typeof platformService.getOverview>> = {
    jsonEntries: 0,
    namespaces: [],
    relationalCounts: {},
    databaseError: null,
    activeProfile: { id: profile.profileId, label: profile.label },
  };
  let schema: Awaited<ReturnType<typeof platformService.getSchemaExplorer>> = [];

  try {
    [overview, schema] = await Promise.all([
      platformService.getOverview(),
      platformService.getSchemaExplorer(),
    ]);
  } catch (e) {
    overview.databaseError =
      e instanceof Error ? e.message : "Could not connect to the database.";
  }

  const jsonSources = toClientSourceMetaList(platformService.getJsonStoreSources());
  const browsableSources = toClientSourceMetaList(platformService.getBrowsableSources());

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-3xl font-semibold">Data Platform</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Hybrid MySQL + JSON storage console. Inspect all 85 models, edit JSON
          configuration, browse relational data, and manage backups.
        </p>
      </div>
      <DataPlatformConsole
        overview={overview}
        schema={schema}
        jsonSources={jsonSources}
        browsableSources={browsableSources}
      />
    </div>
  );
}
