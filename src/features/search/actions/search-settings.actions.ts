"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/features/auth/guards";
import {
  adminLocale,
  resolveConfiguredLocaleCode,
} from "@/features/catalog/admin/catalog-admin-config";
import { patchSiteSettingsKey } from "@/features/catalog/site-settings.service";
import { prisma } from "@/lib/prisma";
import { discoverCatalogSearchSources } from "@/features/search-framework/discovery/catalog-search-discovery";
import { resolveContentTypeSearchConfig } from "@/features/search-framework/schema/content-type-search-config";
import {
  isBuiltinContentTypeSlug,
  builtinKeyForContentTypeSlug,
} from "@/features/search/settings/search-sources";
import {
  adminSearchSettingsSchema,
  type AdminSearchSettings,
} from "@/features/search/settings/admin-search-settings.schema";
import {
  adminSearchSettingsToSiteJson,
  resolveAdminSearchSettings,
} from "@/features/search/settings/resolve-admin-search-settings";
import { searchIndexer } from "@/features/search/search-indexer.service";
import { ensureSearchRuntimeConfig, invalidateSearchRuntimeConfigCache } from "@/features/search/settings/search-runtime";
import { discoverSearchFilterFields } from "@/features/search/settings/discover-search-filters";
import { syncCustomFieldFilters } from "@/features/search/settings/resolve-search-filters";

export type SearchSettingsPageData = {
  settings: AdminSearchSettings;
  locale: string;
  discovery: {
    contentTypes: {
      slug: string;
      labelEn: string;
      searchEnabled: boolean;
      routePrefix: string | null;
    }[];
    allContentTypes: {
      id: string;
      slug: string;
      labelEn: string;
      labelAr: string;
      isEnabled: boolean;
      searchEnabled: boolean;
      isBuiltin: boolean;
      builtinKey: string | null;
    }[];
    kinds: string[];
    documentCount?: number;
    documentsByEntityType?: Record<string, number>;
    discoveredCustomFilters: Awaited<ReturnType<typeof discoverSearchFilterFields>>;
  };
};

export async function loadSearchSettingsPageData(
  localeParam?: string
): Promise<SearchSettingsPageData> {
  await requireAdmin();
  const locale = resolveConfiguredLocaleCode(localeParam ?? "", adminLocale.code);
  const { debugIngest } = await import("@/lib/debug-ingest");

  let discovery: Awaited<ReturnType<typeof discoverCatalogSearchSources>>;
  let allTypes: Awaited<ReturnType<typeof prisma.contentType.findMany>>;
  let statsResult: { documents: number; byEntityType: Record<string, number> } | null = null;
  let discoveredCustomFilters: Awaited<ReturnType<typeof discoverSearchFilterFields>>;

  try {
    discovery = await discoverCatalogSearchSources();
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    debugIngest("search-settings.actions.ts", "discoverCatalogSearchSources failed", { error: errMsg.slice(0, 300) }, "H3");
    throw error;
  }

  try {
    allTypes = await prisma.contentType.findMany({ orderBy: { sortOrder: "asc" } });
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    debugIngest("search-settings.actions.ts", "contentType.findMany failed", { error: errMsg.slice(0, 300) }, "H1");
    throw error;
  }

  try {
    const { searchEngine } = await import("@/features/search-framework/engine/search-engine");
    statsResult = await searchEngine.statsByType();
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    console.error("[search-settings] statsByType failed:", error);
    debugIngest("search-settings.actions.ts", "statsByType failed", { error: errMsg.slice(0, 300) }, "H3");
  }

  try {
    discoveredCustomFilters = await discoverSearchFilterFields();
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    debugIngest("search-settings.actions.ts", "discoverSearchFilterFields failed", { error: errMsg.slice(0, 300) }, "H1");
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
        labelEn: t.labelPluralEn,
        searchEnabled: t.search.enabled,
        routePrefix: t.routePrefix,
      })),
      allContentTypes: allTypes.map((t) => ({
        id: t.id,
        slug: t.slug,
        labelEn: t.labelPluralEn,
        labelAr: t.labelPluralAr,
        isEnabled: t.isEnabled,
        searchEnabled: resolveContentTypeSearchConfig(t.adminConfig, t.isEnabled).enabled,
        isBuiltin: isBuiltinContentTypeSlug(t.slug),
        builtinKey: builtinKeyForContentTypeSlug(t.slug),
      })),
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
    await patchSiteSettingsKey(locale, "search", adminSearchSettingsToSiteJson(parsed));
    invalidateSearchRuntimeConfigCache(locale);
    await ensureSearchRuntimeConfig(locale);
    revalidatePath("/admin/settings/search");
    revalidatePath("/", "layout");
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
