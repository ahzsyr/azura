import { resolveSearchContentTypeSlug } from "@/capabilities/search/lib/search-public-path";

export type FacetAggregation = {
  filterId: string;
  facetKey: string;
  values: { value: string; count: number }[];
};

export type FacetSourceHit = {
  entityType: string;
  urlPath?: string;
  metadata?: unknown;
  contentTypeSlug?: string;
  facets?: Record<string, string | string[] | number | boolean>;
};

export const DEFAULT_SEARCH_FACET_KEYS = [
  "brand",
  "categories",
  "categorySlug",
  "collectionSlug",
  "tags",
  "contentTypeSlug",
] as const;

function normalizeFacetValues(raw: unknown): string[] {
  if (raw == null) return [];
  if (Array.isArray(raw)) return raw.map(String).map((v) => v.trim()).filter(Boolean);
  const single = String(raw).trim();
  return single ? [single] : [];
}

/** Count facet values from the same hit shape used by public search results. */
export function aggregateFacetsFromHits(
  hits: FacetSourceHit[],
  facetKeys: string[] = [...DEFAULT_SEARCH_FACET_KEYS]
): FacetAggregation[] {
  const counts = new Map<string, Map<string, number>>();

  for (const hit of hits) {
    const meta = (hit.metadata ?? {}) as Record<string, unknown>;
    const hitFacets =
      hit.facets ??
      ((meta.facets && typeof meta.facets === "object" && !Array.isArray(meta.facets)
        ? meta.facets
        : {}) as Record<string, unknown>);

    for (const key of facetKeys) {
      const seen = new Set<string>();
      let values: string[] = [];
      if (key === "contentTypeSlug") {
        const slug = resolveSearchContentTypeSlug({
          entityType: hit.entityType,
          metadata: hit.metadata ?? { contentTypeSlug: hit.contentTypeSlug, facets: hitFacets },
          urlPath: hit.urlPath,
          contentTypeSlug: hit.contentTypeSlug,
        });
        if (slug) values = [slug];
      } else {
        values = normalizeFacetValues(hitFacets[key]);
      }
      for (const v of values) {
        if (seen.has(v)) continue;
        seen.add(v);
        const bucket = counts.get(key) ?? new Map<string, number>();
        bucket.set(v, (bucket.get(v) ?? 0) + 1);
        counts.set(key, bucket);
      }
    }
  }

  return facetKeys
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
