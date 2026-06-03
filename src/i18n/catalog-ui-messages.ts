import { urlPrefixToCatalogLocale, type CatalogLocale } from "@/features/catalog/locales";
import enUsGlobal from "@/data/en-us/ui/global.json";
import arAeGlobal from "@/data/ar-ae/ui/global.json";

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

const BY_CATALOG_LOCALE: Record<CatalogLocale, CatalogUiMessages> = {
  "en-us": extractMessages(enUsGlobal),
  "ar-ae": extractMessages(arAeGlobal),
};

/**
 * Catalog storefront copy from `src/data/<catalog-locale>/ui/global.json`.
 * Static imports avoid `node:fs` in the next-intl request config (Turbopack-safe).
 */
export function loadCatalogUiMessages(urlPrefix: string): CatalogUiMessages {
  const catalogLocale = urlPrefixToCatalogLocale(urlPrefix);
  return BY_CATALOG_LOCALE[catalogLocale] ?? EMPTY;
}
