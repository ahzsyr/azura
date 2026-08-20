/** On-disk seed folder names under seeds/catalog/ (scripts and import workflows only). */
export const SCRIPT_CATALOG_LOCALES = ["en-us"] as const;
export type ScriptCatalogLocale = (typeof SCRIPT_CATALOG_LOCALES)[number];

export const DEFAULT_SCRIPT_CATALOG_LOCALE: ScriptCatalogLocale = "en-us";
