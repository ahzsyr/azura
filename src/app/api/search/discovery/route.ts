import { NextResponse } from "next/server";
import { discoverCatalogSearchSources } from "@/features/search-framework/discovery/catalog-search-discovery";
import { buildSearchDiscoveryPayload } from "@/features/search/discovery/build-search-discovery-payload";
import { ensureSearchRuntimeConfig } from "@/features/search/settings/search-runtime";
import { resolveAdminSearchSettings } from "@/features/search/settings/resolve-admin-search-settings";
import { resolveCatalogSearchSiteConfig } from "@/features/search-framework/schema/content-type-search-config";
import { resolveSearchSources } from "@/features/search/settings/search-sources";
import type { SearchContentKind } from "@/features/search-framework/types";

function emptyDiscoveryPayload() {
  const admin = resolveAdminSearchSettings({});
  const discovery = {
    contentTypes: [],
    contentCollections: [],
    enabledContentTypeSlugs: new Set<string>(),
    enabledContentTypeIds: new Set<string>(),
    siteCatalog: resolveCatalogSearchSiteConfig(null),
    sources: resolveSearchSources({}, {}, {}),
    hasSearchableContentItems: false,
    indexerLocales: [] as Awaited<ReturnType<typeof discoverCatalogSearchSources>>["indexerLocales"],
    kinds: [] as SearchContentKind[],
  };
  return buildSearchDiscoveryPayload(admin, discovery, "public");
}

export async function GET() {
  try {
    const admin = await ensureSearchRuntimeConfig("en-us");
    const discovery = await discoverCatalogSearchSources();
    const payload = buildSearchDiscoveryPayload(admin, discovery, "public");
    return NextResponse.json(payload);
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    console.error("[api/search/discovery] failed:", errMsg);
    return NextResponse.json(emptyDiscoveryPayload(), {
      status: 200,
      headers: {
        "Cache-Control": "no-store, max-age=0",
        "X-Search-Discovery-Fallback": "1",
      },
    });
  }
}
