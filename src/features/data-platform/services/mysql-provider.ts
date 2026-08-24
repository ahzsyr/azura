import type { DataSourceDefinition } from "../registry/types";
import { BROWSABLE_SOURCES, getDataSource } from "../registry/data-sources";

const PAGE_SIZE = 25;

export type ListResult = {
  items: unknown[];
  total: number;
  source: DataSourceDefinition;
};

export const mysqlProvider = {
  /**
   * Returns all MySQL sources that support browsing, filtered optionally by
   * deployment profile (caller is responsible for filtering if needed).
   */
  getBrowsableSources(): DataSourceDefinition[] {
    return BROWSABLE_SOURCES;
  },

  async list(sourceId: string, page = 1): Promise<ListResult> {
    const source = getDataSource(sourceId);
    if (!source) throw new Error(`Unknown data source: ${sourceId}`);
    if (source.storage !== "mysql") throw new Error(`Source ${sourceId} is not a MySQL source`);
    if (!source.capabilities.browse) throw new Error(`Source ${sourceId} is not browsable`);
    if (!source.findMany) throw new Error(`Source ${sourceId} has no findMany implementation`);
    if (!source.count) throw new Error(`Source ${sourceId} has no count implementation`);

    const skip = (page - 1) * PAGE_SIZE;
    const [items, total] = await Promise.all([
      source.findMany({ skip, take: PAGE_SIZE }),
      source.count(),
    ]);

    return { items, total, source };
  },

  async inspect(sourceId: string, id: string): Promise<unknown | null> {
    const source = getDataSource(sourceId);
    if (!source) throw new Error(`Unknown data source: ${sourceId}`);
    if (!source.capabilities.inspect) throw new Error(`Source ${sourceId} does not support inspect`);
    if (!source.findUnique) throw new Error(`Source ${sourceId} has no findUnique implementation`);
    return source.findUnique(id);
  },

  /**
   * Export all records for a source (capped at `limit`).
   * Used by the Data Export action — no pagination, no total count.
   */
  async exportAll(sourceId: string, limit = 500): Promise<unknown[]> {
    const source = getDataSource(sourceId);
    if (!source) throw new Error(`Unknown data source: ${sourceId}`);
    if (!source.capabilities.browse) throw new Error(`Source ${sourceId} is not browsable`);
    if (!source.findMany) throw new Error(`Source ${sourceId} has no findMany implementation`);
    return source.findMany({ skip: 0, take: limit });
  },

  /** Run all registered count functions in parallel. Returns { sourceId → count }. */
  async getCounts(): Promise<Record<string, number>> {
    const { COUNTED_SOURCES } = await import("../registry/data-sources");
    const mysqlCounted = COUNTED_SOURCES.filter((s) => s.storage === "mysql" && s.count);

    const results = await Promise.all(
      mysqlCounted.map(async (s) => {
        const count = await s.count!();
        return [s.id, count] as [string, number];
      })
    );

    return Object.fromEntries(results);
  },
};
