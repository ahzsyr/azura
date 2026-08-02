import "server-only";

import prismaMetadataRaw from "@/generated/prisma-metadata.json";
import { getDeploymentProfile, isAdminNavItemEnabled } from "@/config/deployment-profile";
import { prisma } from "@/lib/prisma";
import { mysqlProvider } from "./mysql-provider";
import { jsonStoreProvider } from "./json-store-provider";
import { BROWSABLE_SOURCES, getDataSource } from "../registry/data-sources";
import { getPrismaModelOverlay, PRISMA_MODEL_OVERLAYS } from "../registry/prisma-overlay";
import type { PlatformOverview, SchemaModelInfo, PrismaMetadata, SearchResult, HealthSignals } from "../types";
import type { DataSourceDefinition } from "../registry/types";

const prismaMetadata = prismaMetadataRaw as PrismaMetadata;

// Build a lookup map from model name → adminHref for the dep-graph links
const overlayHrefMap = new Map<string, string>(
  PRISMA_MODEL_OVERLAYS
    .filter((o) => o.adminHref)
    .map((o) => [o.name, o.adminHref!])
);

function isSourceVisible(source: DataSourceDefinition): boolean {
  if (!source.deploymentNavItemId) return true;
  return isAdminNavItemEnabled(source.deploymentNavItemId);
}

// ---------------------------------------------------------------------------
// Health signals helper (runs in parallel with main overview queries)
// ---------------------------------------------------------------------------

async function fetchHealthSignals(): Promise<HealthSignals> {
  const p = prisma as unknown as {
    contentItem: { count: (a: unknown) => Promise<number> };
    faqSet: { count: (a: unknown) => Promise<number> };
    gallery: { count: (a: unknown) => Promise<number> };
  };

  try {
    const [
      ciTotal, ciPublished, ciDraft, ciScheduled, ciArchived,
      faqTotal, faqActive,
      galTotal, galPublished,
    ] = await Promise.all([
      p.contentItem.count({}),
      p.contentItem.count({ where: { status: "PUBLISHED" } }),
      p.contentItem.count({ where: { status: "DRAFT" } }),
      p.contentItem.count({ where: { status: "SCHEDULED" } }),
      p.contentItem.count({ where: { status: "ARCHIVED" } }),
      p.faqSet.count({}),
      p.faqSet.count({ where: { isPublished: true } }),
      p.gallery.count({}),
      p.gallery.count({ where: { isPublished: true } }),
    ]);

    return {
      contentItems: {
        total: ciTotal,
        published: ciPublished,
        draft: ciDraft,
        scheduled: ciScheduled,
        archived: ciArchived,
      },
      faqSets: { total: faqTotal, active: faqActive },
      galleries: { total: galTotal, published: galPublished },
    };
  } catch {
    return {};
  }
}

export const platformService = {
  /**
   * Aggregate overview counts for the Overview tab.
   * MySQL counts, JSON store totals, and health signals run in parallel.
   */
  async getOverview(): Promise<PlatformOverview> {
    const profile = getDeploymentProfile();

    const [mysqlCounts, jsonTotal, namespaceCounts, healthSignals] = await Promise.all([
      mysqlProvider.getCounts(),
      jsonStoreProvider.getTotalCount(),
      jsonStoreProvider.getNamespaceCounts(),
      fetchHealthSignals(),
    ]);

    return {
      jsonEntries: jsonTotal,
      namespaces: namespaceCounts.map((n) => ({ name: n.namespace, count: n.count })),
      relationalCounts: mysqlCounts,
      databaseError: null,
      activeProfile: { id: profile.profileId, label: profile.label },
      healthSignals,
    };
  },

  /**
   * Schema Explorer: merges generated prisma-metadata.json with prisma-overlay
   * and live counts. All models are included; only those with count fns have a
   * live count. Relations from the metadata are passed through for the dep-graph.
   */
  async getSchemaExplorer(): Promise<SchemaModelInfo[]> {
    const { COUNTED_SOURCES } = await import("../registry/data-sources");
    const mysqlCounted = COUNTED_SOURCES.filter((s) => s.storage === "mysql" && s.count);
    const jsonCount = await jsonStoreProvider.getTotalCount();

    const countResults = await Promise.all(
      mysqlCounted.map(async (s) => {
        const count = await s.count!();
        return [s.prismaModelName ?? s.id, count] as [string, number];
      })
    );
    const countMap: Record<string, number> = Object.fromEntries(countResults);
    countMap["JsonStore"] = jsonCount;

    const results: SchemaModelInfo[] = [];

    for (const model of prismaMetadata.models) {
      const overlay = getPrismaModelOverlay(model.name);
      const isJsonStore = model.name === "JsonStore";

      // Profile visibility: if there's a deploymentNavItemId, check if enabled
      const deploymentNavItemId = overlay?.deploymentNavItemId;
      const profileEnabled = deploymentNavItemId
        ? isAdminNavItemEnabled(deploymentNavItemId)
        : undefined;

      // Enrich relations with adminHrefs for the dep-graph
      const relations = model.relations.map((r) => ({
        field: r.field,
        referencedModel: r.referencedModel,
        referencedAdminHref: overlayHrefMap.get(r.referencedModel),
      }));

      results.push({
        name: model.name,
        kind: isJsonStore ? "json" : "relational",
        category: overlay?.category ?? "system",
        note: overlay?.note ?? "",
        adminHref: overlay?.adminHref,
        deploymentNavItemId,
        profileEnabled,
        fieldCount: model.fields.filter((f) => !f.isRelation).length,
        relationCount: model.relations.length,
        count: countMap[model.name],
        relations,
      });
    }

    return results;
  },

  /** List records for a browsable MySQL source (paginated, 25/page). */
  async listRecords(sourceId: string, page = 1) {
    return mysqlProvider.list(sourceId, page);
  },

  /** Inspect a single record from a MySQL source. */
  async inspectRecord(sourceId: string, id: string) {
    return mysqlProvider.inspect(sourceId, id);
  },

  /**
   * Cross-source search across all browsable MySQL sources that declare a
   * `search` fn in the registry. Results are grouped by source.
   */
  async searchSources(query: string): Promise<SearchResult[]> {
    if (!query.trim()) return [];

    const searchable = BROWSABLE_SOURCES.filter((s) => s.search && isSourceVisible(s));
    const LIMIT = 5;

    const resultSets = await Promise.all(
      searchable.map(async (src) => {
        try {
          const items = await src.search!(query.trim(), LIMIT);
          const mapped = (items as Array<Record<string, unknown>>).map((row) => {
            const id = String(row.id ?? "");
            let title = id;
            let subtitle: string | undefined;
            if (src.list) {
              try { title = src.list.title(row); } catch { /* fall through */ }
              if (src.list.subtitle) {
                try {
                  const sub = src.list.subtitle(row);
                  subtitle = sub ?? undefined;
                } catch { /* fall through */ }
              }
            }
            return { id, title, subtitle };
          });
          return { sourceId: src.id, sourceName: src.displayName, adminHref: src.adminHref, items: mapped };
        } catch {
          return null;
        }
      })
    );

    const out: SearchResult[] = [];
    for (const r of resultSets) {
      if (r && r.items.length > 0) {
        out.push({
          sourceId: r.sourceId,
          sourceName: r.sourceName,
          adminHref: r.adminHref,
          items: r.items,
        });
      }
    }
    return out;
  },

  /** All browsable sources, filtered by deployment profile. */
  getBrowsableSources(): DataSourceDefinition[] {
    return BROWSABLE_SOURCES.filter(isSourceVisible);
  },

  /** All JSON store sources. */
  getJsonStoreSources(): DataSourceDefinition[] {
    return jsonStoreProvider.getSources();
  },
};
