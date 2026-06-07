import { NextRequest, NextResponse } from "next/server";
import {
  searchEngine,
  searchQueryBuilder,
  searchResultMapper,
  searchSettingsManager,
} from "@/features/search-framework";
import { ensureSearchRuntimeConfig } from "@/features/search/settings/search-runtime";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const q = searchParams.get("q") ?? "";
  const locale = searchParams.get("locale") ?? "en";
  const admin = await ensureSearchRuntimeConfig(locale);
  const runtime = searchSettingsManager.getCached();
  if (!runtime.enabled) {
    return NextResponse.json({ results: [], suggestions: [] });
  }
  const mode = searchParams.get("mode") ?? "search";
  const types = searchQueryBuilder.parseTypesParam(searchParams.get("types"));
  const contentTypeSlugs = searchQueryBuilder.parseContentTypeSlugsParam(
    searchParams.get("contentTypeSlugs")
  );
  const kinds = searchQueryBuilder.parseKindsParam(searchParams.get("kinds"));
  const facetFilters = searchQueryBuilder.parseFacetsParam(searchParams.get("facets"));

  const baseInput = {
    q,
    locale,
    entityTypes: types,
    contentTypeSlugs,
    kinds: kinds as import("@/features/search-framework").SearchContentKind[] | undefined,
    facetFilters,
  };

  if (mode === "suggest") {
    if (!runtime.globalSearchEnabled && !admin.general.searchPageEnabled) {
      return NextResponse.json({ suggestions: [] });
    }
    const suggestions = await searchEngine.suggestions({
      ...baseInput,
      limit: runtime.suggestLimit,
    });
    return NextResponse.json({
      suggestions: suggestions.map((s) => ({
        title: s.title,
        urlPath: s.urlPath,
        entityType: s.entityType,
        kind: s.kind,
        contentTypeSlug: s.contentTypeSlug,
      })),
    });
  }

  const minLen = runtime.minQueryLength;
  const offset = Math.max(0, Number(searchParams.get("offset") ?? 0) || 0);
  const limitParam = searchParams.get("limit");
  const limit = limitParam
    ? Math.min(80, Math.max(1, Number(limitParam) || runtime.resultsPerPage))
    : runtime.resultsPerPage;

  const [page, suggestions] = await Promise.all([
    searchEngine.searchPage({ ...baseInput, limit, offset }),
    q.length >= minLen && runtime.globalSearchEnabled
      ? searchEngine.suggestions({ ...baseInput, limit: Math.min(5, runtime.suggestLimit) })
      : Promise.resolve([]),
  ]);

  return NextResponse.json({
    results: page.results.map((r) => searchResultMapper.toApiPayload(r)),
    pagination: {
      offset: page.offset,
      limit: page.limit,
      hasMore: page.hasMore,
      total: page.total,
    },
    suggestions: suggestions.map((s) => ({
      title: s.title,
      urlPath: s.urlPath,
      entityType: s.entityType,
      kind: s.kind,
      contentTypeSlug: s.contentTypeSlug,
    })),
  });
}
