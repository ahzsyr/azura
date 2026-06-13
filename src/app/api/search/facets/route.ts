import { NextRequest, NextResponse } from "next/server";
import { ensureSearchRuntimeConfig } from "@/features/search/settings/search-runtime";
import {
  aggregateSearchFacets,
} from "@/features/search-framework/filter/search-facet-engine";

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

  return NextResponse.json({ facets });
}
