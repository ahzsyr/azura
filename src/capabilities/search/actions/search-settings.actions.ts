"use server";



import { revalidatePath } from "next/cache";

import { requireAdmin } from "@/features/auth/guards";

import {

  adminLocale,

  resolveConfiguredLocaleCode,

} from "@/features/catalog/admin/catalog-admin-config";

import { patchSiteSettingsKey } from "@/features/catalog/site-settings.service";

import { prisma } from "@/lib/prisma";

import { discoverCatalogSearchSources } from "@/capabilities/search/engine/discovery/catalog-search-discovery";

import { resolveContentTypeSearchConfig } from "@/capabilities/search/engine/schema/content-type-search-config";

import {

  PACKAGES_LEGACY_SLUG,

  builtinKeyForContentTypeSlug,

  resolveContentTypeSourceLabel,

} from "@/capabilities/search/settings/search-sources";

import { getBuiltinContentType, readOriginBuiltinSlug } from "@/features/content/content-type.registry";

import { loadTranslationBundle } from "@/features/translation/translation-bundle";

import { localizedField } from "@/features/portal/lib/portal-translation";

import {

  adminSearchSettingsSchema,

  type AdminSearchSettings,

} from "@/capabilities/search/settings/admin-search-settings.schema";

import {

  adminSearchSettingsToSiteJson,

  resolveAdminSearchSettings,

} from "@/capabilities/search/settings/resolve-admin-search-settings";

import { searchIndexer } from "@/capabilities/search/search-indexer.service";

import { ensureSearchRuntimeConfig, invalidateSearchRuntimeConfigCache } from "@/capabilities/search/settings/search-runtime";

import { discoverSearchFilterFields } from "@/capabilities/search/settings/discover-search-filters";

import { syncCustomFieldFilters } from "@/capabilities/search/settings/resolve-search-filters";



export type SearchSettingsPageData = {

  settings: AdminSearchSettings;

  locale: string;

  discovery: {

    contentTypes: {

      slug: string;

        labelPlural: import("@/features/translation/types").LocalizedValueMap;

      searchEnabled: boolean;

      routePrefix: string | null;

    }[];

    allContentTypes: {

      id: string;

      slug: string;

      label: string;

      isEnabled: boolean;

      searchEnabled: boolean;

      isBuiltin: boolean;

      builtinKey: string | null;

      originBuiltinSlug: string | null;

    }[];

    kinds: string[];

    documentCount?: number;

    documentsByEntityType?: Record<string, number>;

    discoveredCustomFilters: Awaited<ReturnType<typeof discoverSearchFilterFields>>;

  };

};



async function mapAllContentTypes(
  allTypes: Awaited<ReturnType<typeof prisma.contentType.findMany>>,
  locale: string
): Promise<SearchSettingsPageData["discovery"]["allContentTypes"]> {
  const typeBundle = await loadTranslationBundle(
    allTypes.map((row) => ({ entityType: "ContentType" as const, entityId: row.id }))
  );
  return allTypes.map((row) => {
    const originBuiltinSlug = readOriginBuiltinSlug(row.adminConfig);
    const labelPlural = localizedField(typeBundle, "ContentType", row.id, "labelPlural");
    const name = localizedField(typeBundle, "ContentType", row.id, "name");
    return {
      id: row.id,
      slug: row.slug,
      label: resolveContentTypeSourceLabel(labelPlural, name, row.slug, locale),
      isEnabled: row.isEnabled,
      searchEnabled: resolveContentTypeSearchConfig(row.adminConfig, row.isEnabled).enabled,
      isBuiltin: Boolean(
        getBuiltinContentType(row.slug) || row.slug === PACKAGES_LEGACY_SLUG || originBuiltinSlug
      ),
      builtinKey: builtinKeyForContentTypeSlug(row.slug),
      originBuiltinSlug,
    };
  });
}

export async function loadSearchSettingsPageData(

  localeParam?: string

): Promise<SearchSettingsPageData> {

  await requireAdmin();

  const locale = resolveConfiguredLocaleCode(localeParam ?? "", adminLocale.code);



  let discovery: Awaited<ReturnType<typeof discoverCatalogSearchSources>>;

  let allTypes: Awaited<ReturnType<typeof prisma.contentType.findMany>>;

  let statsResult: { documents: number; byEntityType: Record<string, number> } | null = null;

  let discoveredCustomFilters: Awaited<ReturnType<typeof discoverSearchFilterFields>>;



  try {

    discovery = await discoverCatalogSearchSources();

  } catch (error) {

    throw error;

  }



  try {

    allTypes = await prisma.contentType.findMany({ orderBy: { sortOrder: "asc" } });

  } catch (error) {

    throw error;

  }



  try {

    const { searchEngine } = await import("@/capabilities/search/engine/engine/search-engine");

    statsResult = await searchEngine.statsByType();

  } catch (error) {

    console.error("[search-settings] statsByType failed:", error);

  }



  try {

    discoveredCustomFilters = await discoverSearchFilterFields();

  } catch (error) {

    throw error;

  }



  const siteSettings = await import("@/features/catalog/site-settings.service").then((m) =>

    m.readSiteSettings(locale)

  );

  const baseSettings = resolveAdminSearchSettings(siteSettings);

  const settings: AdminSearchSettings = {

    ...baseSettings,

    filters: {

      ...baseSettings.filters,

      customFields: syncCustomFieldFilters(

        baseSettings.filters.customFields,

        discoveredCustomFilters

      ),

      displayOrder: [

        ...baseSettings.filters.displayOrder,

        ...discoveredCustomFilters

          .map((f) => f.id)

          .filter((id) => !baseSettings.filters.displayOrder.includes(id)),

      ],

    },

  };

  await ensureSearchRuntimeConfig(locale);



  return {

    settings,

    locale,

    discovery: {

      contentTypes: discovery.contentTypes.map((t) => ({

        slug: t.slug,

        labelPlural: t.labelPlural,

        searchEnabled: t.search.enabled,

        routePrefix: t.routePrefix,

      })),

      allContentTypes: await mapAllContentTypes(allTypes, locale),

      kinds: discovery.kinds,

      documentCount: statsResult?.documents,

      documentsByEntityType: statsResult?.byEntityType,

      discoveredCustomFilters,

    },

  };

}



export async function saveAdminSearchSettings(

  input: AdminSearchSettings,

  localeParam?: string

): Promise<{ ok: true } | { ok: false; error: string }> {

  await requireAdmin();

  try {

    const parsed = adminSearchSettingsSchema.parse(input);

    const locale = resolveConfiguredLocaleCode(localeParam ?? "", adminLocale.code);

    const knownSlugs = new Set(

      (await prisma.contentType.findMany({ select: { slug: true } })).map((row) => row.slug)

    );

    const contentTypeSlugs = Object.fromEntries(

      Object.entries(parsed.sources.contentTypeSlugs).filter(([slug]) => knownSlugs.has(slug))

    );

    const settings = {

      ...parsed,

      sources: { ...parsed.sources, contentTypeSlugs },

    };

    await patchSiteSettingsKey(locale, "search", adminSearchSettingsToSiteJson(settings));

    invalidateSearchRuntimeConfigCache(locale);

    await ensureSearchRuntimeConfig(locale);

    revalidatePath("/admin/settings/search");

    return { ok: true };

  } catch (e) {

    return {

      ok: false,

      error: e instanceof Error ? e.message : "Save failed",

    };

  }

}



export type RebuildSearchIndexResult =

  | {

      ok: true;

      documents: number;

      byEntityType: Record<string, number>;

      warnings: string[];

    }

  | { ok: false; error: string };



export async function rebuildSearchIndexFromSettings(): Promise<RebuildSearchIndexResult> {

  await requireAdmin();

  try {

    const result = await searchIndexer.rebuildAll();

    revalidatePath("/admin/settings/search");

    return {

      ok: true,

      documents: result.documents,

      byEntityType: result.byEntityType,

      warnings: result.warnings,

    };

  } catch (e) {

    if (e instanceof AggregateError && e.errors.length) {

      const first = e.errors[0];

      const extra =

        e.errors.length > 1 ? ` (+${e.errors.length - 1} more)` : "";

      return {

        ok: false,

        error: `${first instanceof Error ? first.message : String(first)}${extra}`,

      };

    }

    return {

      ok: false,

      error: e instanceof Error ? e.message : "Rebuild failed",

    };

  }

}

