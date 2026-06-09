import { NextRequest, NextResponse } from "next/server";
import { searchSettingsManager } from "@/features/search-framework";
import { ensureSearchRuntimeConfig } from "@/features/search/settings/search-runtime";
import { searchService } from "@/features/search/service";
import {
  parseTypesParam,
  parseContentTypeSlugsParam,
  parseKindsParam,
  parseFacetsParam,
} from "@/features/search/api/params";
import type { SearchContentKind } from "@/features/search-framework/types";

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
  const types = parseTypesParam(searchParams.get("types"));
  const contentTypeSlugs = parseContentTypeSlugsParam(searchParams.get("contentTypeSlugs"));
  const kinds = parseKindsParam(searchParams.get("kinds"));
  const facetFilters = parseFacetsParam(searchParams.get("facets"));

  const baseInput = {
    q,
    locale,
    types,
    contentTypeSlugs,
    kinds: kinds as SearchContentKind[] | undefined,
    facetFilters,
  };

  if (mode === "suggest") {
    if (!runtime.globalSearchEnabled && !admin.general.searchPageEnabled) {
      return NextResponse.json({ suggestions: [] });
    }
    const suggestions = await searchService.suggestions({
      ...baseInput,
      limit: runtime.suggestLimit,
    });
    return NextResponse.json({ suggestions });
  }

  const minLen = runtime.minQueryLength;
  const offset = Math.max(0, Number(searchParams.get("offset") ?? 0) || 0);
  const limitParam = searchParams.get("limit");
  const limit = limitParam
    ? Math.min(80, Math.max(1, Number(limitParam) || runtime.resultsPerPage))
    : runtime.resultsPerPage;

  const [page, suggestions] = await Promise.all([
    searchService.searchPage({ ...baseInput, limit, offset }),
    q.length >= minLen && runtime.globalSearchEnabled
      ? searchService.suggestions({ ...baseInput, limit: Math.min(5, runtime.suggestLimit) })
      : Promise.resolve([]),
  ]);

  return NextResponse.json({
    results: page.results,
    pagination: page.pagination,
    suggestions,
  });
}
