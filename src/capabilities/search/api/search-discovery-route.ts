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
import { getDefaultCatalogLocaleCode } from "@/features/catalog/locales";

function emptyDiscoveryPayload(audience: "public" | "admin" = "public") {
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
  if (audience === "admin") {
    return buildSearchDiscoveryPayload(admin, discovery, "admin");
  }
  return buildSearchDiscoveryPayload(admin, discovery, "public", "en");
}

type DiscoveryRouteOptions = {
  audience: "public" | "admin";
  requireAuth: boolean;
  defaultLocale?: string;
};

export function createSearchDiscoveryRoute(options: DiscoveryRouteOptions) {
  return async function GET() {
    const defaultLocale =
      options.defaultLocale ??
      (options.audience === "admin" ? await getDefaultCatalogLocaleCode() : "en-us");
    let phase = "init";

    if (options.requireAuth) {
      const session = await auth();
      if (!session?.user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
    }

    try {
      phase = "runtimeConfig";
      const admin = await ensureSearchRuntimeConfig(defaultLocale);

      phase = "discovery";
      const discovery = await discoverCatalogSearchSources();

      if (options.audience === "public") {
        const payload = await buildSearchDiscoveryPayloadAsync(admin, discovery, "public", "en");
        return NextResponse.json(payload);
      }

      phase = "payload";
      const payload = buildSearchDiscoveryPayload(admin, discovery, "admin");
      phase = "serialize";
      return NextResponse.json(payload);
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      const logLabel =
        options.audience === "admin"
          ? "[api/manage/search/discovery]"
          : "[api/search/discovery]";
      console.error(`${logLabel} failed (${phase}):`, errMsg);

      return NextResponse.json(emptyDiscoveryPayload(options.audience), {
        status: 200,
        headers: {
          "Cache-Control": "no-store, max-age=0",
          "X-Search-Discovery-Fallback": "1",
        },
      });
    }
  };
}
