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
} from "@/services/cache";
import { REVALIDATE } from "@/lib/config/performance";
import {
  adminLocale,
  resolveConfiguredLocaleCode,
} from "@/features/catalog/admin/catalog-admin-config";
import { urlPrefixToCatalogLocale, type CatalogLocale } from "@/features/catalog/locales";

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
  "pageTransitions",
  "headerNavUi",
  "languageSwitcher",
  "catalogPageHero",
  "productListingLayout",
  "catalogToolbarDock",
  "productPageLayout",
  "productCardLayout",
  "productPageDisplay",
  "productPageAddToCart",
  "productBuyNow",
  "productPagePromo",
  "productPageTrust",
  "productPageElementOrder",
  "productPageCompactDisplay",
  "catalogBrands",
  "catalogTags",
] as const;

export type PatchableSiteKey = (typeof PATCHABLE_SITE_KEYS)[number];

const SITE_SETTINGS_NAMESPACE = "site-settings";

export function isPatchableSiteKey(key: string): key is PatchableSiteKey {
  return (PATCHABLE_SITE_KEYS as readonly string[]).includes(key);
}

export function getSiteSettingsPath(catalogLocale: CatalogLocale): string {
  return join(process.cwd(), "src", "data", catalogLocale, "ui", "site.json");
}

function catalogLocaleFromParam(locale: string): CatalogLocale {
  return urlPrefixToCatalogLocale(locale);
}

function deepMergeSettings(
  base: Record<string, unknown>,
  overlay: Record<string, unknown>,
): Record<string, unknown> {
  const out: Record<string, unknown> = { ...base };
  for (const [key, value] of Object.entries(overlay)) {
    const existing = out[key];
    if (
      value &&
      typeof value === "object" &&
      !Array.isArray(value) &&
      existing &&
      typeof existing === "object" &&
      !Array.isArray(existing)
    ) {
      out[key] = deepMergeSettings(
        existing as Record<string, unknown>,
        value as Record<string, unknown>,
      );
    } else {
      out[key] = value;
    }
  }
  return out;
}

async function loadJsonStoreOverlay(
  catalogLocale: CatalogLocale,
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
  catalogLocale: CatalogLocale,
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
  catalogLocale: CatalogLocale,
): Promise<{ data: Record<string, unknown>; mtime: number } | null> {
  const path = getSiteSettingsPath(catalogLocale);
  try {
    const s = await stat(path);
    const raw = await readFile(path, "utf-8");
    return { data: JSON.parse(raw) as Record<string, unknown>, mtime: s.mtimeMs };
  } catch {
    return null;
  }
}

async function readSiteSettingsMerged(
  catalogLocale: CatalogLocale,
): Promise<Record<string, unknown>> {
  const file = await readSiteSettingsFile(catalogLocale);
  const overlay = await loadJsonStoreOverlay(catalogLocale);
  const fileData = file?.data ?? {};
  return deepMergeSettings(fileData, overlay);
}

const readSiteSettingsByLocale = (catalogLocale: CatalogLocale) =>
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
    const catalogLocale = catalogLocaleFromParam(locale);
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

export function invalidateSiteSettingsCache(): void {
  revalidateJsonNamespace(SITE_SETTINGS_NAMESPACE);
  revalidateMarketingHome();
  // Bust locale shells so preloader + site settings props refresh immediately.
  for (const prefix of ["en", "ar", "en-us", "ar-ae"]) {
    safeRevalidateLayout(`/${prefix}`);
  }
}

async function persistSiteSettingsToFile(
  catalogLocale: CatalogLocale,
  data: Record<string, unknown>,
): Promise<boolean> {
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
  const catalogLocale = catalogLocaleFromParam(locale);

  const file = await readSiteSettingsFile(catalogLocale);
  const overlay = await loadJsonStoreOverlay(catalogLocale);
  const fileData = file?.data ?? {};
  const merged = deepMergeSettings(fileData, overlay);
  const next = { ...merged, [key]: value };
  const nextOverlay = { ...overlay, [key]: value };

  const useJsonStore = Boolean(process.env.VERCEL);
  let wroteFile = false;

  if (!useJsonStore) {
    wroteFile = await persistSiteSettingsToFile(catalogLocale, next);
  }

  if (useJsonStore || !wroteFile) {
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
  const catalogLocale = catalogLocaleFromParam(locale);

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
