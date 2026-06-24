import type { SearchEntityType } from "@prisma/client";
import type { SearchFacetFilter, SearchRawRow, SearchVisibility } from "@/capabilities/search/engine/types";
import { searchRegistry } from "@/capabilities/search/engine/registry/search-registry";
import type { ResolvedSearchFilterDef } from "@/capabilities/search/settings/resolve-search-filters";

function parseMetadata(row: FilterableRow): Record<string, unknown> {
  return (row.metadata ?? {}) as Record<string, unknown>;
}

function rowFacets(row: FilterableRow): Record<string, unknown> {
  const meta = parseMetadata(row);
  const facets = meta.facets;
  if (facets && typeof facets === "object" && !Array.isArray(facets)) {
    return facets as Record<string, unknown>;
  }
  return {};
}

function rowVisibility(row: FilterableRow): SearchVisibility {
  const meta = parseMetadata(row);
  if (row.entityType === "MEDIA" || meta.adminOnly === true) return "admin";
  return "public";
}

function normalizeFacetValue(value: unknown): string[] {
  if (value == null) return [];
  if (Array.isArray(value)) return value.map(String).filter(Boolean);
  return [String(value)].filter(Boolean);
}

function facetValueMatches(rowValues: string[], selected: string[]): boolean {
  if (selected.length === 0) return true;
  const lower = rowValues.map((v) => v.toLowerCase());
  return selected.some((s) => lower.includes(s.toLowerCase()));
}

function readFacetValuesForKeys(row: FilterableRow, facetKeys: string[]): string[] {
  const facets = rowFacets(row);
  const meta = parseMetadata(row);
  const values: string[] = [];
  for (const key of facetKeys) {
    values.push(...normalizeFacetValue(facets[key]));
    if (key === "contentTypeSlug" && meta.contentTypeSlug) {
      values.push(String(meta.contentTypeSlug));
    }
    if (key === "publishedAt" && meta.publishedAt) {
      values.push(String(meta.publishedAt));
    }
    if (key === "status" && meta.status) {
      values.push(String(meta.status));
    }
  }
  return values;
}

type FilterableRow = Pick<SearchRawRow, "entityType" | "metadata">;

export class SearchFilterEngine {
  applyFacetFilter<T extends FilterableRow>(rows: T[], filter: SearchFacetFilter): T[] {
    return rows.filter((row) => {
      const meta = parseMetadata(row);
      if (filter.entityTypes?.length && !filter.entityTypes.includes(row.entityType)) {
        return false;
      }
      if (filter.kinds?.length) {
        const kind = searchRegistry.kindForEntityType(row.entityType, row.metadata);
        if (!filter.kinds.includes(kind)) return false;
      }
      if (filter.contentTypeSlugs?.length) {
        const slug = meta.contentTypeSlug as string | undefined;
        if (!slug || !filter.contentTypeSlugs.includes(slug)) return false;
      }
      if (filter.visibility?.length) {
        const vis = rowVisibility(row);
        if (!filter.visibility.includes(vis)) return false;
      }
      if (filter.facetValues) {
        for (const [facetKey, selected] of Object.entries(filter.facetValues)) {
          if (!selected?.length) continue;
          const rowValues = readFacetValuesForKeys(row, [facetKey]);
          if (!facetValueMatches(rowValues, selected)) return false;
        }
      }
      return true;
    });
  }

  applyConfiguredFacetFilters<T extends FilterableRow>(
    rows: T[],
    facetValues: Record<string, string[]>,
    filterDefs: ResolvedSearchFilterDef[]
  ): T[] {
    const expanded: Record<string, string[]> = {};
    for (const [paramKey, values] of Object.entries(facetValues)) {
      if (!values.length) continue;
      const def = filterDefs.find((d) => d.id === paramKey || d.facetKeys.includes(paramKey));
      if (def) {
        for (const fk of def.facetKeys) {
          expanded[fk] = [...(expanded[fk] ?? []), ...values];
        }
      } else {
        expanded[paramKey] = values;
      }
    }
    return this.applyFacetFilter(rows, { facetValues: expanded });
  }

  filterForAudience<T extends FilterableRow>(
    rows: T[],
    options: { includeAdmin?: boolean }
  ): T[] {
    if (options.includeAdmin) return rows;
    return rows.filter((row) => {
      const vis = rowVisibility(row);
      return vis === "public";
    });
  }

  buildFacetFilter(plan: {
    entityTypes?: SearchEntityType[];
    contentTypeSlugs?: string[];
    kinds?: string[];
    includeAdmin?: boolean;
    facetValues?: Record<string, string[]>;
  }): SearchFacetFilter {
    return {
      entityTypes: plan.entityTypes,
      contentTypeSlugs: plan.contentTypeSlugs,
      kinds: plan.kinds,
      visibility: plan.includeAdmin ? ["public", "admin"] : ["public"],
      facetValues: plan.facetValues,
    };
  }
}

export const searchFilterEngine = new SearchFilterEngine();
