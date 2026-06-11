import {
  searchEngine,
  searchResultMapper,
  searchSettingsManager,
} from "@/features/search-framework";
import type { SearchContentKind } from "@/features/search-framework/types";
import type { AdminSearchSettings } from "@/features/search/settings/admin-search-settings.schema";
import { resolvePublicAutocompleteConfig } from "@/features/search/settings/search-autocomplete-config";
import { getTrendingSearchQueries } from "@/features/search/analytics/search-analytics-store.service";
import {
  parseTypesParam,
  parseContentTypeSlugsParam,
  parseKindsParam,
  parseFacetsParam,
} from "@/features/search/api/params";

export type AutocompleteRequestParams = {
  q: string;
  locale: string;
  types?: string | null;
  contentTypeSlugs?: string | null;
  kinds?: string | null;
  facets?: string | null;
  includeAdmin?: boolean;
};

export async function handleSearchAutocomplete(
  admin: AdminSearchSettings,
  params: AutocompleteRequestParams
) {
  const runtime = searchSettingsManager.getCached();
  const ac = resolvePublicAutocompleteConfig(admin.autocomplete);
  const empty = {
    popular: [] as string[],
    trending: [] as string[],
    suggestions: [] as ReturnType<typeof mapSuggestion>[],
    results: [] as ReturnType<typeof mapResult>[],
    grouped: undefined as Record<string, ReturnType<typeof mapResult>[]> | undefined,
  };

  if (!runtime.enabled) return empty;

  const types = parseTypesParam(params.types ?? null);
  const contentTypeSlugs = parseContentTypeSlugsParam(params.contentTypeSlugs ?? null);
  const kinds = parseKindsParam(params.kinds ?? null);
  const facetFilters = parseFacetsParam(params.facets ?? null);

  const baseInput = {
    q: params.q,
    locale: params.locale,
    entityTypes: types,
    contentTypeSlugs,
    kinds: kinds as SearchContentKind[] | undefined,
    facetFilters,
    includeAdmin: params.includeAdmin,
  };

  const popular = ac.showPopular ? ac.popularQueries.slice(0, ac.recentLimit) : [];
  const trending =
    ac.showTrending && admin.autocomplete.recordTrending !== false
      ? await getTrendingSearchQueries(
          params.locale,
          ac.recentLimit,
          admin.autocomplete.trendingQueries ?? []
        )
      : ac.showTrending
        ? (admin.autocomplete.trendingQueries ?? []).slice(0, ac.recentLimit)
        : [];

  const suggestions =
    ac.showSuggestions &&
    ac.instantSuggestions !== false &&
    params.q.length >= ac.suggestMinLength
      ? await searchEngine.suggestions({ ...baseInput, limit: ac.suggestLimit })
      : [];

  const results =
    params.q.length >= runtime.minQueryLength
      ? await searchEngine.search({ ...baseInput, limit: runtime.maxResults })
      : [];

  const includeAdmin = params.includeAdmin === true;
  const resultPayloads = results.map((r) =>
    mapResult(
      includeAdmin
        ? searchResultMapper.toAdminApiPayload(r)
        : searchResultMapper.toApiPayload(r),
      includeAdmin
    )
  );

  const grouped: Record<string, typeof resultPayloads> = {};
  if (ac.groupResults) {
    for (const r of resultPayloads) {
      const key = r.entityType;
      const list = grouped[key] ?? [];
      list.push(r);
      grouped[key] = list;
    }
  }

  return {
    popular,
    trending,
    suggestions: suggestions.map((s) => mapSuggestion(s, includeAdmin)),
    results: resultPayloads,
    grouped: ac.groupResults ? grouped : undefined,
  };
}

function mapSuggestion(
  s: {
    title: string;
    urlPath: string;
    adminPath?: string;
    entityType: import("@prisma/client").SearchEntityType;
    kind?: string;
    contentTypeSlug?: string;
  },
  includeAdmin: boolean
) {
  return {
    id: `suggest-${s.urlPath}`,
    title: s.title,
    urlPath: s.urlPath,
    ...(includeAdmin && s.adminPath ? { adminPath: s.adminPath } : {}),
    entityType: s.entityType,
    kind: s.kind,
    contentTypeSlug: s.contentTypeSlug,
  };
}

function mapResult(
  r: {
    id: string;
    title: string;
    snippet?: string;
    urlPath: string;
    adminPath?: string;
    entityType: import("@prisma/client").SearchEntityType;
    score?: number;
    facets?: Record<string, string | string[] | number | boolean>;
    kind?: string;
    contentTypeSlug?: string;
    entityId?: string;
  },
  includeAdmin: boolean
) {
  return {
    id: r.id,
    entityId: r.entityId ?? r.id,
    title: r.title,
    snippet: r.snippet,
    urlPath: r.urlPath,
    ...(includeAdmin && r.adminPath ? { adminPath: r.adminPath } : {}),
    entityType: r.entityType,
    score: r.score,
    facets: r.facets,
    kind: r.kind,
    contentTypeSlug: r.contentTypeSlug,
  };
}
