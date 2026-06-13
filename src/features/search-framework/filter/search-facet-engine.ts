import type { SearchEntityType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { parseFacetsParam, parseTypesParam } from "@/features/search/api/params";

export type FacetAggregation = {
  filterId: string;
  facetKey: string;
  values: { value: string; count: number }[];
};

export async function aggregateSearchFacets(params: {
  q: string;
  locale: string;
  types?: string | null;
  facets?: string | null;
  facetKeys?: string[];
}): Promise<FacetAggregation[]> {
  const locale = params.locale;
  const types = parseTypesParam(params.types ?? null);
  const keys = params.facetKeys?.length
    ? params.facetKeys
    : ["brand", "categories", "categorySlug", "collectionSlug", "tags", "contentTypeSlug"];

  const rows = await prisma.searchDocument.findMany({
    where: {
      locale,
      ...(types?.length ? { entityType: { in: types } } : {}),
      ...(params.q.trim()
        ? {
            OR: [
              { title: { contains: params.q.trim() } },
              { body: { contains: params.q.trim() } },
            ],
          }
        : {}),
    },
    select: { metadata: true },
    take: 2000,
  });

  const counts = new Map<string, Map<string, number>>();

  for (const row of rows) {
    const meta = (row.metadata ?? {}) as Record<string, unknown>;
    const facets = (meta.facets ?? {}) as Record<string, unknown>;
    for (const key of keys) {
      const raw = facets[key];
      if (raw == null) continue;
      const values = Array.isArray(raw) ? raw.map(String) : [String(raw)];
      for (const v of values) {
        if (!v.trim()) continue;
        const bucket = counts.get(key) ?? new Map<string, number>();
        bucket.set(v, (bucket.get(v) ?? 0) + 1);
        counts.set(key, bucket);
      }
    }
  }

  return keys
    .map((facetKey) => {
      const bucket = counts.get(facetKey);
      if (!bucket?.size) return null;
      const values = [...bucket.entries()]
        .map(([value, count]) => ({ value, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 24);
      return {
        filterId: facetKey === "contentTypeSlug" ? "contentType" : facetKey,
        facetKey,
        values,
      };
    })
    .filter((x): x is FacetAggregation => x != null);
}

export async function countByEntityTypeForQuery(params: {
  q: string;
  locale: string;
  types?: string | null;
  facets?: string | null;
}): Promise<{ entityType: SearchEntityType; count: number }[]> {
  const locale = params.locale;
  const types = parseTypesParam(params.types ?? null);

  const where: Prisma.SearchDocumentWhereInput = {
    locale,
    ...(types?.length ? { entityType: { in: types } } : {}),
    ...(params.q.trim()
      ? {
          OR: [
            { title: { contains: params.q.trim() } },
            { body: { contains: params.q.trim() } },
          ],
        }
      : {}),
  };

  const rows = await prisma.searchDocument.groupBy({
    by: ["entityType"],
    where,
    _count: { _all: true },
  });

  return rows.map((r) => ({
    entityType: r.entityType,
    count: r._count._all,
  }));
}
