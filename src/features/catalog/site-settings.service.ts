import "server-only";

import { readFile, writeFile, mkdir, stat } from "node:fs/promises";
import { dirname, join } from "node:path";
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
  "productPagePromo",
  "productPageTrust",
  "productPageElementOrder",
  "productPageCompactDisplay",
  "catalogBrands",
  "catalogTags",
] as const;

export type PatchableSiteKey = (typeof PATCHABLE_SITE_KEYS)[number];

export function isPatchableSiteKey(key: string): key is PatchableSiteKey {
  return (PATCHABLE_SITE_KEYS as readonly string[]).includes(key);
}

export function getSiteSettingsPath(catalogLocale: CatalogLocale): string {
  return join(process.cwd(), "src", "data", catalogLocale, "ui", "site.json");
}

function catalogLocaleFromParam(locale: string): CatalogLocale {
  return urlPrefixToCatalogLocale(locale);
}

let cache: { locale: string; mtime: number; data: Record<string, unknown> } | null = null;

export async function readSiteSettings(
  localeParam?: string,
): Promise<Record<string, unknown>> {
  const locale = resolveConfiguredLocaleCode(localeParam ?? "", adminLocale.code);
  const catalogLocale = catalogLocaleFromParam(locale);
  const path = getSiteSettingsPath(catalogLocale);

  try {
    const s = await stat(path);
    if (cache && cache.locale === catalogLocale && cache.mtime === s.mtimeMs) {
      return { ...cache.data };
    }
    const raw = await readFile(path, "utf-8");
    const data = JSON.parse(raw) as Record<string, unknown>;
    cache = { locale: catalogLocale, mtime: s.mtimeMs, data };
    return { ...data };
  } catch {
    return {};
  }
}

export function invalidateSiteSettingsCache(): void {
  cache = null;
}

export async function patchSiteSettingsKey(
  localeParam: string | undefined,
  key: PatchableSiteKey,
  value: unknown,
): Promise<Record<string, unknown>> {
  const locale = resolveConfiguredLocaleCode(localeParam ?? "", adminLocale.code);
  const catalogLocale = catalogLocaleFromParam(locale);
  const path = getSiteSettingsPath(catalogLocale);

  const existing = await readSiteSettings(locale);
  const next = { ...existing, [key]: value };

  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, JSON.stringify(next, null, 2), "utf-8");
  invalidateSiteSettingsCache();

  return next;
}

export async function writeSiteSettings(
  localeParam: string | undefined,
  data: Record<string, unknown>,
): Promise<void> {
  const locale = resolveConfiguredLocaleCode(localeParam ?? "", adminLocale.code);
  const catalogLocale = catalogLocaleFromParam(locale);
  const path = getSiteSettingsPath(catalogLocale);

  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, JSON.stringify(data, null, 2), "utf-8");
  invalidateSiteSettingsCache();
}
