import type { SearchEntityType } from "@prisma/client";
import { SEARCH_ENTITY_TYPES } from "@/features/search/constants";
import { searchRegistry } from "@/features/search-framework/registry/search-registry";
import { searchSettingsManager } from "@/features/search-framework/settings/search-settings-manager";
import type { SearchQueryInput, SearchQueryPlan } from "@/features/search-framework/types";
import { analyzeSmartQuery } from "@/features/search/core/query/smart-query";
import { getSearchSmartConfig } from "@/features/search/settings/resolve-search-smart-config";
import { hasArabicScript, sanitizeQuery, tokenize } from "@/features/search/core/text";
import {
  parseTypesParam,
  parseContentTypeSlugsParam,
  parseKindsParam,
  parseFacetsParam,
} from "@/features/search/api/params";

const VALID_ENTITY_TYPES = new Set<string>(SEARCH_ENTITY_TYPES);

export class SearchQueryBuilder {
  build(input: SearchQueryInput): SearchQueryPlan {
    const settings = searchSettingsManager.getCached();
    const sanitizedQuery = sanitizeQuery(input.q);
    const smart = analyzeSmartQuery(sanitizedQuery, getSearchSmartConfig());
    const tokens = smart.tokens.length ? smart.tokens : tokenize(sanitizedQuery);
    const phraseQuery = smart.phraseQuery || sanitizedQuery;
    const expandedTokens =
      smart.expandedTokens.length > 0 ? smart.expandedTokens : tokens;
    const expandedQuery = smart.expandedQuery || sanitizedQuery;
    const entityTypes = this.parseEntityTypes(input);
    const limit = Math.min(Math.max(input.limit ?? settings.defaultLimit, 1), 80);
    const offset = Math.max(input.offset ?? 0, 0);
    const useFullText =
      tokens.length > 0 &&
      !hasArabicScript(sanitizedQuery) &&
      sanitizedQuery.length >= settings.fullTextMinLength;

    const facetFilters = input.facetFilters;
    let contentTypeSlugs = input.contentTypeSlugs?.filter(Boolean);
    if (facetFilters?.contentType?.length) {
      contentTypeSlugs = [...new Set([...(contentTypeSlugs ?? []), ...facetFilters.contentType])];
    }

    return {
      sanitizedQuery,
      phraseQuery,
      tokens,
      expandedTokens,
      expandedQuery,
      locale: input.locale,
      entityTypes,
      contentTypeSlugs,
      kinds: input.kinds,
      facetFilters,
      useFullText,
      limit,
      offset,
      includeAdmin: input.includeAdmin === true,
      mode: input.mode ?? "search",
    };
  }

  parseEntityTypes(input: SearchQueryInput): SearchEntityType[] | undefined {
    const fromRegistry = searchRegistry.resolveEntityTypes({
      entityTypes: input.entityTypes,
      kinds: input.kinds,
    });
    const explicit = input.entityTypes?.filter((t) => VALID_ENTITY_TYPES.has(t));
    if (explicit?.length) {
      const merged = new Set<SearchEntityType>([...explicit, ...(fromRegistry ?? [])]);
      return Array.from(merged);
    }
    return fromRegistry;
  }

  /** @deprecated Use `@/features/search/api/params` directly. */
  parseTypesParam = parseTypesParam;

  /** @deprecated Use `@/features/search/api/params` directly. */
  parseContentTypeSlugsParam = parseContentTypeSlugsParam;

  /** @deprecated Use `@/features/search/api/params` directly. */
  parseKindsParam = parseKindsParam;

  /** @deprecated Use `@/features/search/api/params` directly. */
  parseFacetsParam = parseFacetsParam;
}

export const searchQueryBuilder = new SearchQueryBuilder();
