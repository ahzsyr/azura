/**
 * Legacy facade — delegates to Search Framework engine.
 * @see @/features/search-framework
 */
import type { SearchEntityType } from "@prisma/client";
import { searchEngine, searchResultMapper } from "@/features/search-framework";
import type { SearchResult as FrameworkSearchResult } from "@/features/search-framework";

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
  async search(params: {
    q: string;
    locale: string;
    types?: SearchEntityType[];
    limit?: number;
    includeAdmin?: boolean;
    contentTypeSlugs?: string[];
    kinds?: string[];
  }): Promise<SearchHit[]> {
    const results = await searchEngine.search({
      q: params.q,
      locale: params.locale,
      entityTypes: params.types,
      contentTypeSlugs: params.contentTypeSlugs,
      kinds: params.kinds,
      limit: params.limit,
      includeAdmin: params.includeAdmin,
    });
    return results.map(toLegacyHit);
  },

  async suggestions(params: {
    q: string;
    locale: string;
    limit?: number;
    includeAdmin?: boolean;
    contentTypeSlugs?: string[];
    kinds?: string[];
    types?: SearchEntityType[];
  }) {
    const rows = await searchEngine.suggestions({
      q: params.q,
      locale: params.locale,
      limit: params.limit,
      includeAdmin: params.includeAdmin,
      entityTypes: params.types,
      contentTypeSlugs: params.contentTypeSlugs,
      kinds: params.kinds,
    });
    return rows.map((s) => ({
      title: s.title,
      urlPath: s.urlPath,
      entityType: s.entityType,
      adminPath: s.adminPath,
    }));
  },

  async stats() {
    return searchEngine.stats();
  },

  /** Map framework results to public API JSON (includes kind + contentTypeSlug). */
  toApiResults(results: FrameworkSearchResult[]) {
    return results.map((r) => searchResultMapper.toApiPayload(r));
  },
};
