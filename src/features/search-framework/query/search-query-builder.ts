import type { SearchEntityType } from "@prisma/client";
import { SEARCH_ENTITY_TYPES } from "@/features/search/constants";
import { searchRegistry } from "@/features/search-framework/registry/search-registry";
import { searchSettingsManager } from "@/features/search-framework/settings/search-settings-manager";
import type { SearchQueryInput, SearchQueryPlan } from "@/features/search-framework/types";
import { analyzeSmartQuery } from "@/features/search-framework/query/search-smart-query";
import { getSearchSmartConfig } from "@/features/search/settings/resolve-search-smart-config";
import { hasArabicScript, sanitizeQuery, tokenize } from "@/features/search/search-text";

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

  /** Parse comma-separated API `types` param (legacy + current enum values only). */
  parseTypesParam(typesParam: string | null): SearchEntityType[] | undefined {
    if (!typesParam) return undefined;
    const parsed = typesParam
      .split(",")
      .map((t) => t.trim())
      .filter((t) => VALID_ENTITY_TYPES.has(t)) as SearchEntityType[];
    return parsed.length ? parsed : undefined;
  }

  /** Parse `contentTypeSlugs` query param. */
  parseContentTypeSlugsParam(param: string | null): string[] | undefined {
    if (!param) return undefined;
    const slugs = param
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    return slugs.length ? slugs : undefined;
  }

  /** Parse `kinds` query param for logical content kinds. */
  parseKindsParam(param: string | null): string[] | undefined {
    if (!param) return undefined;
    return param
      .split(",")
      .map((k) => k.trim())
      .filter(Boolean);
  }

  /** Parse `facets` JSON: `{ "category": ["tours"], "custom:packages:city": ["MAKKAH"] }` */
  parseFacetsParam(param: string | null): Record<string, string[]> | undefined {
    if (!param?.trim()) return undefined;
    try {
      const parsed = JSON.parse(param) as Record<string, unknown>;
      const out: Record<string, string[]> = {};
      for (const [key, value] of Object.entries(parsed)) {
        if (Array.isArray(value)) {
          const vals = value.map(String).filter(Boolean);
          if (vals.length) out[key] = vals;
        } else if (typeof value === "string" && value) {
          out[key] = [value];
        }
      }
      return Object.keys(out).length ? out : undefined;
    } catch {
      return undefined;
    }
  }
}

export const searchQueryBuilder = new SearchQueryBuilder();
