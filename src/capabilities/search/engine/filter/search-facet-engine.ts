import type { SearchEntityType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { parseFacetsParam, parseTypesParam } from "@/capabilities/search/api/params";
import { searchEngine } from "@/capabilities/search/engine/engine/search-engine";
import { searchFilterEngine } from "@/capabilities/search/engine/filter/search-filter-engine";
import {
  aggregateFacetsFromHits,
  DEFAULT_SEARCH_FACET_KEYS,
  type FacetAggregation,
  type FacetSourceHit,
} from "@/capabilities/search/engine/filter/search-facet-aggregate";
import { searchRepository } from "@/repositories/search.repository";

export type { FacetAggregation, FacetSourceHit };
export { aggregateFacetsFromHits };

const FACET_CANDIDATE_LIMIT = 200;

/**
 * Facet chips for the public search page.
 * Uses the same search candidate set as results (not a separate contains-query),
 * and ignores active `contentType` so chips reflect what "All" would show.
 */
export async function aggregateSearchFacets(params: {
  q: string;
  locale: string;
  types?: string | null;
  facets?: string | null;
  facetKeys?: string[];
}): Promise<FacetAggregation[]> {
  const locale = params.locale;
  const types = parseTypesParam(params.types ?? null);
  const keys = params.facetKeys?.length ? params.facetKeys : [...DEFAULT_SEARCH_FACET_KEYS];
  const incomingFacets = parseFacetsParam(params.facets ?? null) ?? {};
  // Do not apply contentType when counting — chips must match unfiltered All results.
  const { contentType: _contentType, ...facetFiltersWithoutContentType } = incomingFacets;
  const facetFilters =
    Object.keys(facetFiltersWithoutContentType).length > 0
      ? facetFiltersWithoutContentType
      : undefined;

  const q = params.q.trim();
  let hits: FacetSourceHit[] = [];

  if (q) {
    const page = await searchEngine.searchPage(
      {
        q,
        locale,
        entityTypes: types,
        facetFilters,
        limit: FACET_CANDIDATE_LIMIT,
        offset: 0,
        includeAdmin: false,
      },
      { skipCache: true }
    );
    hits = page.results.map((r) => ({
      entityType: r.entityType,
      urlPath: r.urlPath,
      contentTypeSlug: r.contentTypeSlug,
      facets: r.facets,
      metadata: {
        contentTypeSlug: r.contentTypeSlug,
        facets: r.facets,
      },
    }));
  } else {
    const listed = await searchRepository.listDocuments({
      locale,
      types,
      limit: FACET_CANDIDATE_LIMIT,
      offset: 0,
    });
    const publicRows = searchFilterEngine.filterForAudience(listed, { includeAdmin: false });
    const filtered = searchFilterEngine.applyFacetFilter(publicRows, {
      entityTypes: types,
      facetValues: facetFilters,
      visibility: ["public"],
    });
    hits = filtered.map((row) => ({
      entityType: row.entityType,
      urlPath: row.urlPath,
      metadata: row.metadata,
    }));
  }

  return aggregateFacetsFromHits(hits, keys);
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
