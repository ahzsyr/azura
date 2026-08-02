import type { ListingFacets, ProductListingRecord } from "@/features/products/listing/types";
import { SEARCH_SEMANTICS_CONTRACT } from "@/capabilities/search/core/text";

export const PRODUCT_INDEX_VERSION = 1;
export const PRODUCT_INDEX_SCHEMA_VERSION = SEARCH_SEMANTICS_CONTRACT.schemaVersion;
export const PRODUCT_INDEX_TOKENIZATION_VERSION = SEARCH_SEMANTICS_CONTRACT.tokenizationVersion;
export const PRODUCT_INDEX_FACET_SCHEMA_VERSION = SEARCH_SEMANTICS_CONTRACT.facetSchemaVersion;
export const PRODUCT_INDEX_RANKING_VERSION = SEARCH_SEMANTICS_CONTRACT.rankingVersion;

export type ProductIndexSemanticVersions = {
  schemaVersion: number;
  tokenizationVersion: number;
  facetSchemaVersion: number;
  rankingVersion: number;
};

export const PRODUCT_INDEX_SEMANTIC_VERSIONS: ProductIndexSemanticVersions = {
  schemaVersion: PRODUCT_INDEX_SCHEMA_VERSION,
  tokenizationVersion: PRODUCT_INDEX_TOKENIZATION_VERSION,
  facetSchemaVersion: PRODUCT_INDEX_FACET_SCHEMA_VERSION,
  rankingVersion: PRODUCT_INDEX_RANKING_VERSION,
};

export type IndexedProductListingRecord = ProductListingRecord & {
  sortName?: string;
  sortPrice?: number;
  updatedAt?: string;
  usesSourceFallback?: boolean;
};

export type ProductListingIndexFile = {
  version: number;
  semanticVersions?: ProductIndexSemanticVersions;
  locale: string;
  generatedAt: string;
  sourceSignature: string;
  currency: string;
  priceBounds: { min: number; max: number };
  records: IndexedProductListingRecord[];
};

export type FacetIndexScope = ListingFacets;

export type FacetIndexFile = {
  version: number;
  semanticVersions?: ProductIndexSemanticVersions;
  locale: string;
  generatedAt: string;
  global: FacetIndexScope;
  byCollection: Record<string, Partial<ListingFacets>>;
};

export type CategoryIndexFile = {
  version: number;
  semanticVersions?: ProductIndexSemanticVersions;
  locale: string;
  categories: Record<string, string[]>;
};

export type CollectionIndexFile = {
  version: number;
  semanticVersions?: ProductIndexSemanticVersions;
  locale: string;
  collections: Record<string, string[]>;
};

export type SearchTokenIndexFile = {
  version: number;
  semanticVersions?: ProductIndexSemanticVersions;
  locale: string;
  tokens: Record<string, string[]>;
};

export type InvertedFacetIndexFile = {
  version: number;
  semanticVersions?: ProductIndexSemanticVersions;
  locale: string;
  facets: Record<string, string[]>;
};

export type SlugPathIndexFile = {
  version: number;
  semanticVersions?: ProductIndexSemanticVersions;
  locale: string;
  paths: Record<string, string>;
};

export type ProductIndexManifest = {
  version: number;
  semanticVersions?: ProductIndexSemanticVersions;
  generatedAt: string;
  locales: string[];
  counts: Record<string, number>;
  signatures: Record<string, string>;
};

export type SlugRegistryEntry = {
  id: string;
  locales: string[];
  canonicalLocale: string;
};

export type SlugRegistryFile = {
  version: number;
  generatedAt: string;
  products: Record<string, SlugRegistryEntry>;
};

export type ProductListingQueryResult = {
  records: ProductListingRecord[];
  facets: ListingFacets;
  total: number;
  page: number;
  per: number;
  totalPages: number;
};
