import {
  urlPrefixToSeedFolder,
  type SeedCatalogLocaleFolder,
} from "@/features/catalog/seed-locale-folders";
import enUsGlobal from "@/seeds/catalog/en-us/ui/global.json";

export type CatalogUiMessages = {
  product: Record<string, string>;
  collection: Record<string, string>;
  nav?: Record<string, string>;
};

const EMPTY: CatalogUiMessages = { product: {}, collection: {} };

function extractMessages(raw: {
  product?: Record<string, string>;
  collection?: Record<string, string>;
  nav?: Record<string, string>;
}): CatalogUiMessages {
  return {
    product: raw.product ?? {},
    collection: raw.collection ?? {},
    nav: raw.nav,
  };
}

const BY_SEED_FOLDER: Record<SeedCatalogLocaleFolder, CatalogUiMessages> = {
  "en-us": extractMessages(enUsGlobal),
};

/**
 * Catalog storefront copy from `seeds/catalog/<catalog-locale>/ui/global.json`.
 * Static imports avoid `node:fs` in the next-intl request config (Turbopack-safe).
 */
export function loadCatalogUiMessages(urlPrefix: string): CatalogUiMessages {
  const seedFolder = urlPrefixToSeedFolder(urlPrefix);
  return BY_SEED_FOLDER[seedFolder] ?? EMPTY;
}
