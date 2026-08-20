import { NextRequest, NextResponse } from "next/server";
import { searchSettingsManager } from "@/capabilities/search/engine";
import { ensureSearchRuntimeConfig } from "@/capabilities/search/settings/search-runtime";
import { searchService } from "@/capabilities/search/service";
import {
  parseTypesParam,
  parseContentTypeSlugsParam,
  parseKindsParam,
  parseFacetsParam,
  mergeScopeFacetFilters,
} from "@/capabilities/search/api/params";
import type { SearchContentKind } from "@/capabilities/search/engine/types";
import {
  buildRelatedSearchTerms,
  buildSearchSections,
} from "@/capabilities/search/lib/search-related-terms";
import { analyzeSmartQuery } from "@/capabilities/search/core/query/smart-query";
import { getSearchSmartConfig } from "@/capabilities/search/settings/resolve-search-smart-config";
import { sanitizeQuery } from "@/capabilities/search/core/text";
import { isCapabilityEnabled } from "@/config/deployment-profile";
import { withPublicSearchCacheHeaders } from "@/capabilities/search/api/search-cache-headers";

export async function GET(request: NextRequest) {
  if (!isCapabilityEnabled("search")) {
    return NextResponse.json({ results: [], suggestions: [] });
  }
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
  const facetFilters = mergeScopeFacetFilters({
    scope: searchParams.get("scope"),
    kinds,
    types,
    facetFilters: parseFacetsParam(searchParams.get("facets")),
  });

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

  const [page, suggestions, sections] = await Promise.all([
    searchService.searchPage({ ...baseInput, limit, offset }),
    q.length >= minLen && runtime.globalSearchEnabled
      ? searchService.suggestions({ ...baseInput, limit: Math.min(5, runtime.suggestLimit) })
      : Promise.resolve([]),
    q.length >= minLen
      ? buildSearchSections({
          q,
          locale,
          types: searchParams.get("types"),
          facets: searchParams.get("facets"),
        })
      : Promise.resolve([]),
  ]);

  const sanitized = sanitizeQuery(q);
  const smart = analyzeSmartQuery(sanitized, getSearchSmartConfig());
  const relatedTerms = buildRelatedSearchTerms(q);
  const expandedQuery =
    smart.expandedQuery && smart.expandedQuery !== sanitized ? smart.expandedQuery : null;

  return withPublicSearchCacheHeaders(
    NextResponse.json({
      results: page.results,
      pagination: page.pagination,
      suggestions,
      sections,
      relatedTerms,
      expandedQuery,
    }),
    "search"
  );
}
