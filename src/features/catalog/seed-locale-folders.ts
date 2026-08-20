/** On-disk seed folder names under seeds/catalog/ (scripts and import workflows only). */
export const SEED_CATALOG_LOCALE_FOLDERS = ["en-us"] as const;
export type SeedCatalogLocaleFolder = (typeof SEED_CATALOG_LOCALE_FOLDERS)[number];
export const DEFAULT_SEED_CATALOG_LOCALE_FOLDER: SeedCatalogLocaleFolder = "en-us";

const PREFIX_TO_SEED_FOLDER: Record<string, SeedCatalogLocaleFolder> = {
  en: "en-us",
  "en-us": "en-us",
};

/** Map url prefix or locale code to a seeds/catalog/ folder name. */
export function urlPrefixToSeedFolder(param: string): SeedCatalogLocaleFolder {
  const key = param.trim().toLowerCase();
  return PREFIX_TO_SEED_FOLDER[key] ?? DEFAULT_SEED_CATALOG_LOCALE_FOLDER;
}
