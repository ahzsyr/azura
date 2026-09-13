import type { SearchEntityType } from "@prisma/client";
import {
  searchEngine,
  searchResultMapper,
  type SearchResult as FrameworkSearchResult,
} from "@/capabilities/search/engine";
import { enrichCatalogProductSearchResults } from "@/capabilities/search/engine/enrich/enrich-catalog-product-results";
import type { SearchContentKind } from "@/capabilities/search/engine/types";

export type SearchHit = {
  id: string;
  entityType: SearchEntityType;
  entityId: string;
  locale: string;
  title: string;
  snippet: string;
  urlPath: string;
  adminPath: string;
  score: number;
};

export type SearchPageParams = {
  q: string;
  locale: string;
  types?: SearchEntityType[];
  limit?: number;
  offset?: number;
  includeAdmin?: boolean;
  contentTypeSlugs?: string[];
  kinds?: SearchContentKind[];
  facetFilters?: Record<string, string[]>;
};

function toLegacyHit(r: FrameworkSearchResult): SearchHit {
  return {
    id: r.id,
    entityType: r.entityType,
    entityId: r.entityId,
    locale: r.locale,
    title: r.title,
    snippet: r.snippet,
    urlPath: r.urlPath,
    adminPath: r.adminPath,
    score: r.score,
  };
}

export const searchService = {
  async search(params: SearchPageParams): Promise<SearchHit[]> {
    const results = await searchEngine.search({
      q: params.q,
      locale: params.locale,
      entityTypes: params.types,
      contentTypeSlugs: params.contentTypeSlugs,
      kinds: params.kinds,
      facetFilters: params.facetFilters,
      limit: params.limit,
      offset: params.offset,
      includeAdmin: params.includeAdmin,
    });
    return results.map(toLegacyHit);
  },

  async searchPage(params: SearchPageParams) {
    const page = await searchEngine.searchPage({
      q: params.q,
      locale: params.locale,
      entityTypes: params.types,
      contentTypeSlugs: params.contentTypeSlugs,
      kinds: params.kinds,
      facetFilters: params.facetFilters,
      limit: params.limit,
      offset: params.offset,
      includeAdmin: params.includeAdmin,
    });
    const enriched = await enrichCatalogProductSearchResults(
      page.results,
      params.locale,
      params.q,
    );
    return {
      results: enriched.map((r) =>
        params.includeAdmin
          ? searchResultMapper.toAdminApiPayload(r)
          : searchResultMapper.toApiPayload(r)
      ),
      pagination: {
        offset: page.offset,
        limit: page.limit,
        hasMore: page.hasMore,
        total: page.total,
        isEstimate: page.isEstimate,
      },
    };
  },

  async suggestions(params: {
    q: string;
    locale: string;
    limit?: number;
    includeAdmin?: boolean;
    contentTypeSlugs?: string[];
    kinds?: SearchContentKind[];
    types?: SearchEntityType[];
    facetFilters?: Record<string, string[]>;
  }) {
    const rows = await searchEngine.suggestions({
      q: params.q,
      locale: params.locale,
      limit: params.limit,
      includeAdmin: params.includeAdmin,
      entityTypes: params.types,
      contentTypeSlugs: params.contentTypeSlugs,
      kinds: params.kinds,
      facetFilters: params.facetFilters,
    });
    return rows.map((s) => ({
      title: s.title,
      urlPath: s.urlPath,
      entityType: s.entityType,
      adminPath: s.adminPath,
      kind: s.kind,
      contentTypeSlug: s.contentTypeSlug,
    }));
  },

  async stats(locale?: string) {
    return searchEngine.stats(locale);
  },

  async statsByType(locale?: string) {
    return searchEngine.statsByType(locale);
  },

  toApiResults(results: FrameworkSearchResult[]) {
    return results.map((r) => searchResultMapper.toApiPayload(r));
  },
};
