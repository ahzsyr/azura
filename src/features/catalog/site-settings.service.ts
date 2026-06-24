import "server-only";

import { cache } from "react";
import type { Prisma } from "@prisma/client";
import { readFile, writeFile, mkdir, stat } from "node:fs/promises";
import { dirname, join } from "node:path";
import { revalidatePath } from "next/cache";
import {
  createCached,
  CACHE_TAGS,
  revalidateJsonNamespace,
  revalidateMarketingHome,
  revalidateProductListing,
} from "@/services/cache";
import { REVALIDATE } from "@/lib/config/performance";
import {
  adminLocale,
  resolveConfiguredLocaleCode,
} from "@/features/catalog/admin/catalog-admin-config";
import { getDefaultCatalogLocaleCode, normalizeCatalogLocaleCode } from "@/features/catalog/locales";
import { localeService } from "@/features/i18n/locale.service";
import { useDatabaseOnlyCatalog } from "@/features/catalog/catalog-data-source";
import { siteSettingsRepository } from "@/repositories/site-settings.repository";
import {
  assertFilesystemPersistenceAllowed,
  isCloudNativeProduction,
} from "@/lib/cloud-native-guard";
import { catalogSeedRoot } from "@/lib/catalog-seed-paths";
import {
  deepMergeSettings,
  mergeLocaleSiteSettingsWithDefault,
} from "@/features/catalog/site-settings-merge";

export { mergeLocaleSiteSettingsWithDefault } from "@/features/catalog/site-settings-merge";

export const PATCHABLE_SITE_KEYS = [
  "nav",
  "megaMenus",
  "footer",
  "shopCta",
  "productCta",
  "social",
  "contact",
  "headerStyle",
  "headerDensity",
  "mobileMenuAnimation",
  "search",
  "sitePreloader",
  "siteAnnouncementBar",
  "sitePopups",
  "pageTransitions",
  "headerNavUi",
  "languageSwitcher",
  "catalogPageHero",
  "productListingLayout",
  "catalogToolbarDock",
  "productPageLayout",
  "productPageLayoutResponsive",
  "productCardLayout",
  "productCardDesign",
  "productCardDesignResponsive",
  "productPageDisplay",
  "productPageAddToCart",
  "productBuyNow",
  "productPagePromo",
  "productPageTrust",
  "productPageElementOrder",
  "productPageCompactDisplay",
  "productPageElementsResponsive",
  "productPageLayoutConfig",
  "productPageOverflow",
  "catalogBrands",
  "catalogTags",
  "catalogBrandProfiles",
] as const;

export type PatchableSiteKey = (typeof PATCHABLE_SITE_KEYS)[number];

const SITE_SETTINGS_NAMESPACE = "site-settings";

export function isPatchableSiteKey(key: string): key is PatchableSiteKey {
  return (PATCHABLE_SITE_KEYS as readonly string[]).includes(key);
}

export function getSiteSettingsPath(catalogLocale: string): string {
  return join(catalogSeedRoot(), catalogLocale, "ui", "site.json");
}

async function catalogLocaleFromParam(locale: string): Promise<string> {
  return normalizeCatalogLocaleCode(locale);
}

function usesSiteSettingsTable(): boolean {
  return useDatabaseOnlyCatalog() || isCloudNativeProduction();
}

function applyPatchableSiteSetting(
  settings: Record<string, unknown>,
  key: PatchableSiteKey,
  value: unknown,
): Record<string, unknown> {
  const next = { ...settings };
  if (value == null) {
    delete next[key];
  } else {
    next[key] = value;
  }
  return next;
}

async function loadJsonStoreOverlay(
  catalogLocale: string,
): Promise<Record<string, unknown>> {
  try {
    const { jsonStoreService } = await import("@/features/storage/json-store.service");
    const stored = await jsonStoreService.get<Record<string, unknown>>(
      SITE_SETTINGS_NAMESPACE,
      catalogLocale,
    );
    return stored ?? {};
  } catch {
    return {};
  }
}

async function saveJsonStoreOverlay(
  catalogLocale: string,
  overlay: Record<string, unknown>,
): Promise<void> {
  const { jsonStoreService } = await import("@/features/storage/json-store.service");
  await jsonStoreService.set(
    SITE_SETTINGS_NAMESPACE,
    catalogLocale,
    overlay as Prisma.InputJsonValue,
  );
}

async function readSiteSettingsFile(
  catalogLocale: string,
): Promise<{ data: Record<string, unknown>; mtime: number } | null> {
  if (isCloudNativeProduction()) return null;
  const path = getSiteSettingsPath(catalogLocale);
  try {
    const s = await stat(path);
    const raw = await readFile(path, "utf-8");
    return { data: JSON.parse(raw) as Record<string, unknown>, mtime: s.mtimeMs };
  } catch {
    return null;
  }
}

async function readLocaleSettingsRaw(
  catalogLocale: string,
): Promise<Record<string, unknown>> {
  const normalized = catalogLocale.trim().toLowerCase();
  if (usesSiteSettingsTable()) {
    const stored = await siteSettingsRepository.get(normalized);
    if (stored) return stored;
  }

  const overlay = await loadJsonStoreOverlay(normalized);
  const file = await readSiteSettingsFile(normalized);
  const fileData = file?.data ?? {};
  return deepMergeSettings(fileData, overlay);
}

async function readSiteSettingsMerged(
  catalogLocale: string,
): Promise<Record<string, unknown>> {
  const normalized = catalogLocale.trim().toLowerCase();
  const localeSettings = await readLocaleSettingsRaw(normalized);
  const defaultCode = (await getDefaultCatalogLocaleCode()).trim().toLowerCase();
  if (normalized === defaultCode) {
    return localeSettings;
  }

  const defaultSettings = await readLocaleSettingsRaw(defaultCode);
  return mergeLocaleSiteSettingsWithDefault(defaultSettings, localeSettings);
}

const readSiteSettingsByLocale = (catalogLocale: string) =>
  createCached(
    () => readSiteSettingsMerged(catalogLocale),
    ["site-settings", catalogLocale],
    {
      tags: [CACHE_TAGS.json(SITE_SETTINGS_NAMESPACE), CACHE_TAGS.marketing],
      revalidate: REVALIDATE.marketing,
    },
  );

/** Request- and cross-request cached site settings per catalog locale. */
export const readSiteSettings = cache(
  async (localeParam?: string): Promise<Record<string, unknown>> => {
    const locale = resolveConfiguredLocaleCode(localeParam ?? "", adminLocale.code);
    const catalogLocale = await catalogLocaleFromParam(locale);
    return readSiteSettingsByLocale(catalogLocale)();
  },
);

function safeRevalidateLayout(path: string): void {
  try {
    revalidatePath(path, "layout");
  } catch {
    // revalidatePath requires Next.js static generation store
  }
}

function revalidateEnabledLocaleLayouts(): void {
  void (async () => {
    try {
      const enabled = await localeService.listEnabled();
      for (const locale of enabled) {
        safeRevalidateLayout(`/${locale.urlPrefix}`);
        safeRevalidateLayout(`/${locale.urlPrefix}/products`);
        revalidateProductListing(locale.urlPrefix);
      }
    } catch {
      for (const prefix of ["en", "en-us", "ar"]) {
        safeRevalidateLayout(`/${prefix}`);
        safeRevalidateLayout(`/${prefix}/products`);
        revalidateProductListing(prefix);
      }
    }
  })();
}

export function invalidateSiteSettingsCache(): void {
  revalidateJsonNamespace(SITE_SETTINGS_NAMESPACE);
  revalidateMarketingHome();
  revalidateEnabledLocaleLayouts();
}

async function persistSiteSettingsToFile(
  catalogLocale: string,
  data: Record<string, unknown>,
): Promise<boolean> {
  if (isCloudNativeProduction()) {
    assertFilesystemPersistenceAllowed("persistSiteSettingsToFile");
  }
  const path = getSiteSettingsPath(catalogLocale);
  try {
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, JSON.stringify(data, null, 2), "utf-8");
    return true;
  } catch {
    return false;
  }
}

export async function patchSiteSettingsKey(
  localeParam: string | undefined,
  key: PatchableSiteKey,
  value: unknown,
): Promise<Record<string, unknown>> {
  const locale = resolveConfiguredLocaleCode(localeParam ?? "", adminLocale.code);
  const catalogLocale = await catalogLocaleFromParam(locale);

  if (usesSiteSettingsTable()) {
    const current = await readSiteSettingsMerged(catalogLocale);
    const next = applyPatchableSiteSetting(current, key, value);
    await siteSettingsRepository.set(catalogLocale, next);
    invalidateSiteSettingsCache();
    return next;
  }

  const file = await readSiteSettingsFile(catalogLocale);
  const overlay = await loadJsonStoreOverlay(catalogLocale);
  const fileData = file?.data ?? {};
  const merged = deepMergeSettings(fileData, overlay);
  const next = applyPatchableSiteSetting(merged, key, value);
  const nextOverlay = value == null ? { ...overlay, [key]: null } : { ...overlay, [key]: value };

  const useJsonStore = Boolean(process.env.VERCEL);
  let wroteFile = false;

  if (!useJsonStore) {
    wroteFile = await persistSiteSettingsToFile(catalogLocale, next);
  }

  if (useJsonStore || !wroteFile) {
    await saveJsonStoreOverlay(catalogLocale, nextOverlay);
  } else if (value == null && Object.prototype.hasOwnProperty.call(overlay, key)) {
    await saveJsonStoreOverlay(catalogLocale, nextOverlay);
  }

  invalidateSiteSettingsCache();
  return next;
}

export async function patchSiteSettingsKeys(
  localeParam: string | undefined,
  patches: ReadonlyArray<{ key: PatchableSiteKey; value: unknown }>,
): Promise<Record<string, unknown>> {
  if (patches.length === 0) {
    throw new Error("No settings patches provided");
  }

  const locale = resolveConfiguredLocaleCode(localeParam ?? "", adminLocale.code);
  const catalogLocale = await catalogLocaleFromParam(locale);

  if (usesSiteSettingsTable()) {
    let next = await readSiteSettingsMerged(catalogLocale);
    for (const { key, value } of patches) {
      next = applyPatchableSiteSetting(next, key, value);
    }
    await siteSettingsRepository.set(catalogLocale, next);
    invalidateSiteSettingsCache();
    return next;
  }

  const file = await readSiteSettingsFile(catalogLocale);
  const overlay = await loadJsonStoreOverlay(catalogLocale);
  const fileData = file?.data ?? {};
  let next = deepMergeSettings(fileData, overlay);
  let nextOverlay = { ...overlay };
  let overlayNeedsClear = false;
  for (const { key, value } of patches) {
    next = applyPatchableSiteSetting(next, key, value);
    if (value == null) {
      nextOverlay = { ...nextOverlay, [key]: null };
      if (Object.prototype.hasOwnProperty.call(overlay, key)) overlayNeedsClear = true;
    } else {
      nextOverlay = { ...nextOverlay, [key]: value };
    }
  }

  const useJsonStore = Boolean(process.env.VERCEL);
  let wroteFile = false;

  if (!useJsonStore) {
    wroteFile = await persistSiteSettingsToFile(catalogLocale, next);
  }

  if (useJsonStore || !wroteFile) {
    await saveJsonStoreOverlay(catalogLocale, nextOverlay);
  } else if (overlayNeedsClear) {
    await saveJsonStoreOverlay(catalogLocale, nextOverlay);
  }

  invalidateSiteSettingsCache();
  return next;
}

export async function writeSiteSettings(
  localeParam: string | undefined,
  data: Record<string, unknown>,
): Promise<void> {
  const locale = resolveConfiguredLocaleCode(localeParam ?? "", adminLocale.code);
  const catalogLocale = await catalogLocaleFromParam(locale);

  if (usesSiteSettingsTable()) {
    await siteSettingsRepository.set(catalogLocale, data);
    invalidateSiteSettingsCache();
    return;
  }

  const useJsonStore = Boolean(process.env.VERCEL);
  let wroteFile = false;

  if (!useJsonStore) {
    wroteFile = await persistSiteSettingsToFile(catalogLocale, data);
  }

  if (useJsonStore || !wroteFile) {
    await saveJsonStoreOverlay(catalogLocale, data);
  }

  invalidateSiteSettingsCache();
}
