import { NextRequest, NextResponse } from "next/server";
import { ensureSearchRuntimeConfig } from "@/capabilities/search/settings/search-runtime";
import {
  aggregateSearchFacets,
} from "@/capabilities/search/engine/filter/search-facet-engine";
import { withPublicSearchCacheHeaders } from "@/capabilities/search/api/search-cache-headers";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const locale = searchParams.get("locale") ?? "en";
  await ensureSearchRuntimeConfig(locale);

  const facets = await aggregateSearchFacets({
    q: searchParams.get("q") ?? "",
    locale,
    types: searchParams.get("types"),
    facets: searchParams.get("facets"),
  });

  return withPublicSearchCacheHeaders(NextResponse.json({ facets }), "facets");
}
