import type { SearchIndexFieldKey } from "@/capabilities/search/engine/indexing/search-index-field-keys";
import type { SearchIndexFieldRule } from "@/capabilities/search/engine/indexing/search-index-profile";

export type ContentTypeSearchConfig = {
  /** Include this type and its items in global search (default: true when type is enabled). */
  enabled?: boolean;
  /** Index the public list URL for this content type. */
  indexLandingPage?: boolean;
  /** Relevance boost multiplier. */
  boost?: number;
  /**
   * Per-field indexing (Phase 4). Keys: title, name, slug, summary, … or `custom:fieldKey`.
   * @see docs/SEARCH_FRAMEWORK.md
   */
  index?: {
    fields?: Partial<Record<SearchIndexFieldKey, boolean | SearchIndexFieldRule>>;
    include?: SearchIndexFieldKey[];
    exclude?: SearchIndexFieldKey[];
  };
  /** @deprecated Use `index.fields` */
  fields?: Partial<Record<SearchIndexFieldKey, boolean | SearchIndexFieldRule>>;
};

export type CatalogSearchSiteConfig = {
  /** Index JSON product catalog (default true). */
  products?: boolean;
  /** Index product collection pages from collections.json (default true). */
  collections?: boolean;
  /** Index product category facets (default true). */
  categories?: boolean;
};

const DEFAULT_TYPE_SEARCH: ContentTypeSearchConfig = {
  enabled: true,
  indexLandingPage: true,
  boost: 1,
};

const DEFAULT_SITE_CATALOG: CatalogSearchSiteConfig = {
  products: true,
  collections: true,
  categories: true,
};

export function resolveContentTypeSearchConfig(
  adminConfig: unknown,
  typeEnabled: boolean
): ContentTypeSearchConfig & { enabled: boolean } {
  const raw =
    adminConfig && typeof adminConfig === "object" && !Array.isArray(adminConfig)
      ? (adminConfig as Record<string, unknown>)
      : {};
  const searchRaw = raw.search;
  const s =
    searchRaw && typeof searchRaw === "object" && !Array.isArray(searchRaw)
      ? (searchRaw as Record<string, unknown>)
      : {};

  const enabled =
    typeEnabled && (s.enabled !== false && raw.searchEnabled !== false);
  const boost =
    typeof s.boost === "number" && Number.isFinite(s.boost) ? s.boost : DEFAULT_TYPE_SEARCH.boost!;

  return {
    enabled,
    indexLandingPage: s.indexLandingPage !== false,
    boost,
  };
}

export function resolveCatalogSearchSiteConfig(
  siteSearch: unknown
): CatalogSearchSiteConfig & { products: boolean; collections: boolean; categories: boolean } {
  const raw =
    siteSearch && typeof siteSearch === "object" && !Array.isArray(siteSearch)
      ? (siteSearch as Record<string, unknown>)
      : {};
  const catalogRaw = raw.catalog;
  const c =
    catalogRaw && typeof catalogRaw === "object" && !Array.isArray(catalogRaw)
      ? (catalogRaw as Record<string, unknown>)
      : {};

  return {
    products: c.products !== false && raw.indexProducts !== false,
    collections: c.collections !== false,
    categories: c.categories !== false,
  };
}

export { DEFAULT_TYPE_SEARCH, DEFAULT_SITE_CATALOG };
