import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  searchEngine,
  searchQueryBuilder,
  searchResultMapper,
} from "@/features/search-framework";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = request.nextUrl;
  const q = searchParams.get("q") ?? "";
  const locale = searchParams.get("locale") ?? "en";
  const mode = searchParams.get("mode") ?? "search";
  const types = searchQueryBuilder.parseTypesParam(searchParams.get("types"));
  const contentTypeSlugs = searchQueryBuilder.parseContentTypeSlugsParam(
    searchParams.get("contentTypeSlugs")
  );
  const kinds = searchQueryBuilder.parseKindsParam(searchParams.get("kinds"));

  const baseInput = {
    q,
    locale,
    entityTypes: types,
    contentTypeSlugs,
    kinds: kinds as import("@/features/search-framework").SearchContentKind[] | undefined,
    includeAdmin: true,
  };

  if (mode === "suggest") {
    const suggestions = await searchEngine.suggestions({ ...baseInput, limit: 10 });
    return NextResponse.json({
      suggestions: suggestions.map((s) => ({
        title: s.title,
        urlPath: s.urlPath,
        entityType: s.entityType,
        kind: s.kind,
        contentTypeSlug: s.contentTypeSlug,
        adminPath: s.adminPath,
      })),
    });
  }

  const results = await searchEngine.search({ ...baseInput, limit: 30 });
  const suggestions =
    q.length >= 2
      ? await searchEngine.suggestions({ ...baseInput, limit: 6 })
      : [];

  return NextResponse.json({
    results: results.map((r) => searchResultMapper.toAdminApiPayload(r)),
    suggestions: suggestions.map((s) => ({
      title: s.title,
      urlPath: s.urlPath,
      entityType: s.entityType,
      kind: s.kind,
      contentTypeSlug: s.contentTypeSlug,
      adminPath: s.adminPath,
    })),
  });
}
