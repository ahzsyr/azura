import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { discoverCatalogSearchSources } from "@/capabilities/search/engine/discovery/catalog-search-discovery";
import {
  buildSearchDiscoveryPayload,
  buildSearchDiscoveryPayloadAsync,
} from "@/capabilities/search/discovery/build-search-discovery-payload";
import { ensureSearchRuntimeConfig } from "@/capabilities/search/settings/search-runtime";
import { resolveAdminSearchSettings } from "@/capabilities/search/settings/resolve-admin-search-settings";
import { resolveCatalogSearchSiteConfig } from "@/capabilities/search/engine/schema/content-type-search-config";
import { resolveSearchSources } from "@/capabilities/search/settings/search-sources";
import type { SearchContentKind } from "@/capabilities/search/engine/types";
import { adminLocale } from "@/features/catalog/admin/catalog-admin-config";

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
  return buildSearchDiscoveryPayload(admin, discovery, "public", "en");
}

type DiscoveryRouteOptions = {
  audience: "public" | "admin";
  requireAuth: boolean;
  defaultLocale?: string;
};

export function createSearchDiscoveryRoute(options: DiscoveryRouteOptions) {
  const defaultLocale = options.defaultLocale ?? (options.audience === "admin" ? adminLocale.code : "en-us");

  return async function GET() {
    if (options.requireAuth) {
      const session = await auth();
      if (!session?.user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
    }

    try {
      const admin = await ensureSearchRuntimeConfig(defaultLocale);
      const discovery = await discoverCatalogSearchSources();

      if (options.audience === "public") {
        const payload = await buildSearchDiscoveryPayloadAsync(admin, discovery, "public", "en");
        return NextResponse.json(payload);
      }

      const payload = buildSearchDiscoveryPayload(admin, discovery, "admin");
      return NextResponse.json(payload);
    } catch (error) {
      if (options.audience === "admin") {
        const errMsg = error instanceof Error ? error.message : String(error);
        console.error("[api/manage/search/discovery] failed:", errMsg);
        return NextResponse.json({ error: "Discovery failed" }, { status: 500 });
      }

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
  };
}
