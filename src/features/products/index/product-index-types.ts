import type { ListingFacets, ProductListingRecord } from "@/features/products/listing/types";
import type { CatalogLocale } from "@/features/catalog/locales";

export const PRODUCT_INDEX_VERSION = 1;

export type IndexedProductListingRecord = ProductListingRecord & {
  sortName?: string;
  sortPrice?: number;
  updatedAt?: string;
  usesSourceFallback?: boolean;
};

export type ProductListingIndexFile = {
  version: number;
  locale: CatalogLocale;
  generatedAt: string;
  sourceSignature: string;
  currency: string;
  priceBounds: { min: number; max: number };
  records: IndexedProductListingRecord[];
};

export type FacetIndexScope = ListingFacets;

export type FacetIndexFile = {
  version: number;
  locale: CatalogLocale;
  generatedAt: string;
  global: FacetIndexScope;
  byCollection: Record<string, Partial<ListingFacets>>;
};

export type CategoryIndexFile = {
  version: number;
  locale: CatalogLocale;
  categories: Record<string, string[]>;
};

export type CollectionIndexFile = {
  version: number;
  locale: CatalogLocale;
  collections: Record<string, string[]>;
};

export type SearchTokenIndexFile = {
  version: number;
  locale: CatalogLocale;
  tokens: Record<string, string[]>;
};

export type SlugPathIndexFile = {
  version: number;
  locale: CatalogLocale;
  paths: Record<string, string>;
};

export type ProductIndexManifest = {
  version: number;
  generatedAt: string;
  locales: CatalogLocale[];
  counts: Record<string, number>;
  signatures: Record<string, string>;
};

export type SlugRegistryEntry = {
  id: string;
  locales: CatalogLocale[];
  canonicalLocale: CatalogLocale;
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
