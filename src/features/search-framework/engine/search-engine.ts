import { searchRepository } from "@/repositories/search.repository";
import { searchFilterEngine } from "@/features/search-framework/filter/search-filter-engine";
import { searchResultMapper } from "@/features/search-framework/mapper/search-result-mapper";
import { searchQueryBuilder } from "@/features/search-framework/query/search-query-builder";
import { searchRankingEngine } from "@/features/search-framework/ranking/search-ranking-engine";
import { searchAnalytics } from "@/features/search-framework/analytics/search-analytics";
import { searchSettingsManager } from "@/features/search-framework/settings/search-settings-manager";
import { resolveSearchModeExecution } from "@/features/search-framework/query/search-mode";
import { searchSemanticProvider } from "@/features/search-framework/semantic/search-semantic-provider";
import { getSearchSmartConfig } from "@/features/search/settings/resolve-search-smart-config";
import { getSearchPerformanceConfig } from "@/features/search-framework/performance/search-performance-config";
import {
  buildSearchCacheKey,
  getCachedSearchResult,
  setCachedSearchResult,
} from "@/features/search-framework/performance/search-query-cache";
import type {
  SearchQueryInput,
  SearchResult,
  SearchSuggestion,
} from "@/features/search-framework/types";

export type SearchPageResult = {
  results: SearchResult[];
  offset: number;
  limit: number;
  hasMore: boolean;
  total: number;
};

const RETRIEVAL_OVERFETCH = 8;

export class SearchEngine {
  async search(input: SearchQueryInput): Promise<SearchResult[]> {
    const page = await this.searchPage(input);
    return page.results;
  }

  async searchPage(input: SearchQueryInput, options?: { skipCache?: boolean }): Promise<SearchPageResult> {
    const started = Date.now();
    const perf = getSearchPerformanceConfig();
    const smartConfig = getSearchSmartConfig();
    let queryText = input.q;
    if (smartConfig.semantic.aiAssistEnabled) {
      queryText = await searchSemanticProvider.rewriteNaturalLanguageQuery(
        queryText,
        smartConfig.semantic
      );
    }
    const plan = searchQueryBuilder.build({ ...input, q: queryText });
    const empty: SearchPageResult = {
      results: [],
      offset: plan.offset,
      limit: plan.limit,
      hasMore: false,
      total: 0,
    };
    if (!plan.sanitizedQuery) return empty;

    const cacheKey = buildSearchCacheKey({
      q: plan.phraseQuery,
      locale: plan.locale,
      types: plan.entityTypes,
      slugs: plan.contentTypeSlugs,
      kinds: plan.kinds,
      facets: plan.facetFilters,
      offset: plan.offset,
      limit: plan.limit,
      admin: plan.includeAdmin,
      mode: input.mode ?? "search",
    });

    if (perf.queryCacheEnabled && !options?.skipCache && input.mode !== "suggest") {
      const cached = getCachedSearchResult(cacheKey);
      if (cached) {
        return {
          results: cached.items,
          offset: plan.offset,
          limit: plan.limit,
          hasMore: cached.hasMore,
          total: cached.total,
        };
      }
    }

    const facetFilter = searchFilterEngine.buildFacetFilter({
      entityTypes: plan.entityTypes,
      contentTypeSlugs: plan.contentTypeSlugs,
      kinds: plan.kinds,
      includeAdmin: plan.includeAdmin,
      facetValues: plan.facetFilters,
    });

    const fetchLimit = Math.min(
      plan.offset + plan.limit + RETRIEVAL_OVERFETCH,
      perf.maxRetrievalCandidates
    );
    const settings = searchSettingsManager.getCached();
    const modeExec = resolveSearchModeExecution(settings.searchMode, {
      useFullTextEligible: plan.useFullText,
      skipLikeWhenFullTextSetting: settings.skipLikeWhenFullText,
    });

    const retrievalTokens = smartConfig.enableSynonyms
      ? plan.expandedTokens
      : plan.tokens;

    const ftRows = modeExec.useFullText
      ? await searchRepository.fullTextSearch({
          q: plan.expandedQuery,
          tokens: retrievalTokens,
          locale: plan.locale,
          types: plan.entityTypes,
          limit: fetchLimit,
        })
      : [];

    const skipLike = modeExec.skipLikeWhenFullText && ftRows.length > 0;
    const likeRows =
      modeExec.useLike && !skipLike
        ? await searchRepository.likeSearch({
            q: plan.expandedQuery,
            tokens: smartConfig.enableMultiKeyword ? retrievalTokens : undefined,
            multiKeywordMode: smartConfig.multiKeywordMode,
            locale: plan.locale,
            types: plan.entityTypes,
            limit: fetchLimit,
          })
        : [];

    const filteredFt = searchFilterEngine.applyFacetFilter(
      searchFilterEngine.filterForAudience(ftRows, { includeAdmin: plan.includeAdmin }),
      facetFilter
    );
    const filteredLike = searchFilterEngine.applyFacetFilter(
      searchFilterEngine.filterForAudience(likeRows, { includeAdmin: plan.includeAdmin }),
      facetFilter
    );

    const semanticBoost = await searchSemanticProvider.semanticScores(
      plan.phraseQuery,
      [...filteredFt, ...filteredLike].map(
        (r) => `${r.entityType}:${r.entityId}:${r.locale}`
      ),
      smartConfig.semantic
    );

    const ranked = searchRankingEngine.mergeRanked(
      filteredFt,
      filteredLike,
      plan.phraseQuery,
      undefined,
      undefined,
      plan,
      semanticBoost
    );

    const pageEnd = plan.offset + plan.limit;
    const hasMore = ranked.length > pageEnd;
    const slice = ranked.slice(plan.offset, pageEnd);
    const results = slice.map((hit) =>
      searchResultMapper.toSearchResult(hit, plan.sanitizedQuery)
    );
    const total = hasMore ? pageEnd + 1 : plan.offset + results.length;

    if (perf.queryCacheEnabled && input.mode !== "suggest") {
      setCachedSearchResult(
        cacheKey,
        { items: results, hasMore, total },
        perf.queryCacheTtlSec
      );
    }

    searchAnalytics.trackQuery({
      q: plan.sanitizedQuery,
      locale: plan.locale,
      resultCount: results.length,
      durationMs: Date.now() - started,
    });

    return {
      results,
      offset: plan.offset,
      limit: plan.limit,
      hasMore,
      total,
    };
  }

  async suggestions(input: SearchQueryInput): Promise<SearchSuggestion[]> {
    const plan = searchQueryBuilder.build({ ...input, mode: "suggest" });
    const settings = searchSettingsManager.getCached();
    if (plan.sanitizedQuery.length < settings.minQueryLength) return [];

    const facetFilter = searchFilterEngine.buildFacetFilter({
      entityTypes: plan.entityTypes,
      contentTypeSlugs: plan.contentTypeSlugs,
      kinds: plan.kinds,
      includeAdmin: plan.includeAdmin,
      facetValues: plan.facetFilters,
    });

    const prefixRows = await searchRepository.prefixSuggestions({
      q: plan.sanitizedQuery,
      locale: plan.locale,
      limit: input.limit ?? settings.suggestLimit,
    });

    const rows = searchFilterEngine.applyFacetFilter(
      searchFilterEngine.filterForAudience(prefixRows, { includeAdmin: plan.includeAdmin }),
      facetFilter
    );

    const suggestions = rows.map((r) => searchResultMapper.toSuggestion(r));
    searchAnalytics.trackSuggest({
      q: plan.sanitizedQuery,
      locale: plan.locale,
      count: suggestions.length,
    });
    return suggestions;
  }

  async stats(locale?: string) {
    const count = await searchRepository.documentCount(locale);
    return { documents: count };
  }

  async statsByType(locale?: string) {
    const [documents, byEntityType] = await Promise.all([
      searchRepository.documentCount(locale),
      searchRepository.documentCountByEntityType(locale),
    ]);
    return { documents, byEntityType };
  }
}

export const searchEngine = new SearchEngine();
