import { DatabaseManager } from "@/features/storage/components/database-manager";
import { databaseService } from "@/features/storage/database.service";

export default async function DatabaseAdminPage() {
  let overview = {
    jsonEntries: 0,
    namespaces: [] as { name: string; count: number }[],
    relationalCounts: {} as Record<string, number>,
  };
  let schema: Awaited<ReturnType<typeof databaseService.getSchemaInspector>> = [];

  try {
    [overview, schema] = await Promise.all([
      databaseService.getOverview(),
      databaseService.getSchemaInspector(),
    ]);
  } catch {
    // DB not connected
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-3xl font-semibold">Database Manager</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Hybrid MySQL + JSON storage. Edit JSON configs here; relational entities stay in Prisma
          with proper relations.
        </p>
      </div>
      <DatabaseManager overview={overview} schema={schema} />
    </div>
  );
}
