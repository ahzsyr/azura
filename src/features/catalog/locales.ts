/** Astro catalog locale folders (on-disk JSON). */
export const CATALOG_LOCALES = ["en-us", "ar-ae"] as const;
export type CatalogLocale = (typeof CATALOG_LOCALES)[number];

const PREFIX_TO_CATALOG: Record<string, CatalogLocale> = {
  en: "en-us",
  ar: "ar-ae",
  "en-us": "en-us",
  "ar-ae": "ar-ae",
};

export function urlPrefixToCatalogLocale(localePrefix: string): CatalogLocale {
  const key = localePrefix.trim().toLowerCase();
  return PREFIX_TO_CATALOG[key] ?? "en-us";
}

export function isCatalogLocale(code: string): code is CatalogLocale {
  return (CATALOG_LOCALES as readonly string[]).includes(code.toLowerCase());
}

export const DEFAULT_CATALOG_LOCALE: CatalogLocale = "en-us";
