import type { SearchEntityType } from "@prisma/client";

/** Logical content kind — stable across Prisma entity types and catalog slugs. */
export type SearchContentKind =
  | "content_item"
  | "content_type"
  | "content_collection"
  | "catalog_product"
  | "catalog_collection"
  | "catalog_category"
  | "post"
  | "cms_page"
  | "faq"
  | "testimonial"
  | "media"
  | (string & {});

export type SearchVisibility = "public" | "admin";

/** Normalized document before persistence in SearchDocument. */
export type SearchIndexRecord = {
  entityType: SearchEntityType;
  entityId: string;
  locale: string;
  title: string;
  body: string;
  urlPath: string;
  kind: SearchContentKind;
  contentTypeSlug?: string;
  visibility: SearchVisibility;
  boost: number;
  facets: Record<string, string | string[] | number | boolean>;
  metadata: Record<string, unknown>;
};

export type SearchQueryInput = {
  q: string;
  locale: string;
  mode?: "search" | "suggest";
  /** Prisma SearchEntityType values */
  entityTypes?: SearchEntityType[];
  /** Catalog content type slugs (metadata.contentTypeSlug) */
  contentTypeSlugs?: string[];
  /** Logical kinds from SearchRegistry */
  kinds?: SearchContentKind[];
  /** Dynamic facet filters (filter id or facet key → values). */
  facetFilters?: Record<string, string[]>;
  limit?: number;
  offset?: number;
  includeAdmin?: boolean;
};

export type SearchQueryPlan = {
  sanitizedQuery: string;
  /** Core phrase after optional natural-language stripping. */
  phraseQuery: string;
  tokens: string[];
  /** Tokens plus synonym expansions for retrieval. */
  expandedTokens: string[];
  expandedQuery: string;
  locale: string;
  entityTypes?: SearchEntityType[];
  contentTypeSlugs?: string[];
  kinds?: SearchContentKind[];
  useFullText: boolean;
  limit: number;
  offset: number;
  includeAdmin: boolean;
  mode: "search" | "suggest";
  facetFilters?: Record<string, string[]>;
};

export type SearchRawRow = {
  id: string;
  entityType: SearchEntityType;
  entityId: string;
  locale: string;
  title: string;
  body: string;
  urlPath: string;
  metadata: unknown;
  relevance?: number;
};

export type SearchResult = {
  id: string;
  entityType: SearchEntityType;
  entityId: string;
  locale: string;
  kind: SearchContentKind;
  contentTypeSlug?: string;
  title: string;
  snippet: string;
  urlPath: string;
  adminPath: string;
  score: number;
  visibility: SearchVisibility;
  facets: Record<string, string | string[] | number | boolean>;
  card?: import("@/features/search/types/search-card").SearchCardPayload;
};

export type SearchSuggestion = {
  title: string;
  urlPath: string;
  entityType: SearchEntityType;
  kind: SearchContentKind;
  contentTypeSlug?: string;
  adminPath: string;
};

export type SearchFacetFilter = {
  entityTypes?: SearchEntityType[];
  contentTypeSlugs?: string[];
  kinds?: SearchContentKind[];
  visibility?: SearchVisibility[];
  /** Facet key → selected values (any value must match). */
  facetValues?: Record<string, string[]>;
};

export type SearchAnalyticsEvent =
  | { type: "query"; q: string; locale: string; resultCount: number; durationMs: number }
  | { type: "zero_results"; q: string; locale: string }
  | { type: "suggest"; q: string; locale: string; count: number }
  | {
      type: "catalog_listing_query";
      q: string;
      locale: string;
      resultCount: number;
      durationMs: number;
      activeFilterCount: number;
      listingMode: "product" | "collection";
      collectionScope?: string | null;
    }
  | {
      type: "catalog_listing_parity";
      locale: string;
      q: string;
      listingMode: "product" | "collection";
      oldResultCount: number;
      newResultCount: number;
      topNOverlap: number;
      facetDivergence: number;
      exclusionReasons: string[];
    }
  | {
      type: "click";
      q: string;
      locale: string;
      entityType: import("@prisma/client").SearchEntityType;
      entityId: string;
      title?: string;
      urlPath: string;
      position?: number;
    }
  | {
      type: "conversion";
      q: string;
      locale: string;
      entityType: import("@prisma/client").SearchEntityType;
      entityId: string;
      title?: string;
      urlPath: string;
    }
  | { type: "filter"; locale: string; filterId: string; values: string[] };

export type SearchMode = "basic" | "advanced" | "fuzzy" | "hybrid";

export type ResolvedSearchSettings = {
  enabled: boolean;
  globalSearchEnabled: boolean;
  searchPageEnabled: boolean;
  searchPagePath: string;
  resultsPerPage: number;
  instantSearch: boolean;
  debounceMs: number;
  fuzziness: number;
  defaultLimit: number;
  suggestLimit: number;
  minQueryLength: number;
  fullTextMinLength: number;
  maxResults: number;
  searchMode: SearchMode;
  skipLikeWhenFullText: boolean;
};
