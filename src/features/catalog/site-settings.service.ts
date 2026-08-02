import "server-only";

import { cache } from "react";
import {
  createCached,
  CACHE_TAGS,
} from "@/services/cache";
import { publishShellChange, type PublishResult } from "@/services/publish-propagation";
import {
  adminLocale,
  resolveConfiguredLocaleCode,
} from "@/features/catalog/admin/catalog-admin-config";
import { getDefaultCatalogLocaleCode, normalizeCatalogLocaleCode } from "@/features/catalog/locales";
import { siteSettingsRepository } from "@/repositories/site-settings.repository";
import {
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
  "search",
  "sitePreloader",
  "siteAnnouncementBar",
  "sitePopups",
  "pageTransitions",
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

export type SiteSettingsSaveResult = {
  settings: Record<string, unknown>;
};

const siteSettingsCacheByLocale = new Map<
  string,
  () => Promise<Record<string, unknown>>
>();

function getReadSiteSettingsCached(catalogLocale: string): () => Promise<Record<string, unknown>> {
  let loader = siteSettingsCacheByLocale.get(catalogLocale);
  if (!loader) {
    loader = createCached(
      () => readSiteSettingsMerged(catalogLocale),
      ["site-settings", catalogLocale],
      {
        tags: [CACHE_TAGS.json(SITE_SETTINGS_NAMESPACE), CACHE_TAGS.marketing],
        revalidate: false,
      },
    );
    siteSettingsCacheByLocale.set(catalogLocale, loader);
  }
  return loader;
}

export function isPatchableSiteKey(key: string): key is PatchableSiteKey {
  return (PATCHABLE_SITE_KEYS as readonly string[]).includes(key);
}

async function catalogLocaleFromParam(locale: string): Promise<string> {
  return normalizeCatalogLocaleCode(locale);
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

async function readLocaleSettingsRaw(catalogLocale: string): Promise<Record<string, unknown>> {
  const normalized = catalogLocale.trim().toLowerCase();
  const stored = await siteSettingsRepository.get(normalized);
  return stored ?? {};
}

async function readSiteSettingsMerged(catalogLocale: string): Promise<Record<string, unknown>> {
  const normalized = catalogLocale.trim().toLowerCase();
  const localeSettings = await readLocaleSettingsRaw(normalized);
  const defaultCode = (await getDefaultCatalogLocaleCode()).trim().toLowerCase();
  if (normalized === defaultCode) {
    return localeSettings;
  }

  const defaultSettings = await readLocaleSettingsRaw(defaultCode);
  return mergeLocaleSiteSettingsWithDefault(defaultSettings, localeSettings);
}

/** Request- and cross-request cached site settings per catalog locale. */
export const readSiteSettings = cache(
  async (localeParam?: string): Promise<Record<string, unknown>> => {
    const locale = resolveConfiguredLocaleCode(localeParam ?? "", adminLocale.code);
    const catalogLocale = await catalogLocaleFromParam(locale);
    return getReadSiteSettingsCached(catalogLocale)();
  },
);

async function publishSiteSettings(localeParam?: string): Promise<PublishResult> {
  const locale = resolveConfiguredLocaleCode(localeParam ?? "", adminLocale.code);
  const catalogLocale = await catalogLocaleFromParam(locale);
  const result = await publishShellChange({ entityType: "site-settings" });
  await siteSettingsRepository.markPublished(catalogLocale);
  return result;
}

export { publishSiteSettings };

export async function patchSiteSettingsKey(
  localeParam: string | undefined,
  key: PatchableSiteKey,
  value: unknown,
): Promise<SiteSettingsSaveResult> {
  const locale = resolveConfiguredLocaleCode(localeParam ?? "", adminLocale.code);
  const catalogLocale = await catalogLocaleFromParam(locale);
  const current = await readSiteSettingsMerged(catalogLocale);
  const next = applyPatchableSiteSetting(current, key, value);
  await siteSettingsRepository.set(catalogLocale, next);
  return { settings: next };
}

export async function patchSiteSettingsKeys(
  localeParam: string | undefined,
  patches: ReadonlyArray<{ key: PatchableSiteKey; value: unknown }>,
): Promise<SiteSettingsSaveResult> {
  if (patches.length === 0) {
    throw new Error("No settings patches provided");
  }

  const locale = resolveConfiguredLocaleCode(localeParam ?? "", adminLocale.code);
  const catalogLocale = await catalogLocaleFromParam(locale);
  let next = await readSiteSettingsMerged(catalogLocale);
  for (const { key, value } of patches) {
    next = applyPatchableSiteSetting(next, key, value);
  }
  await siteSettingsRepository.set(catalogLocale, next);
  return { settings: next };
}

export async function writeSiteSettings(
  localeParam: string | undefined,
  data: Record<string, unknown>,
): Promise<{ settings: Record<string, unknown> }> {
  const locale = resolveConfiguredLocaleCode(localeParam ?? "", adminLocale.code);
  const catalogLocale = await catalogLocaleFromParam(locale);
  await siteSettingsRepository.set(catalogLocale, data);
  return { settings: data };
}
