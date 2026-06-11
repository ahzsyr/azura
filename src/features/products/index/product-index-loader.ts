import "server-only";

import { cache } from "react";
import { access, readFile } from "node:fs/promises";
import { gunzip } from "node:zlib";
import { promisify } from "node:util";
import { join } from "node:path";
import { urlPrefixToCatalogLocale, type CatalogLocale } from "@/features/catalog/locales";
import {
  localeIndexDir,
  productsIndexRoot,
} from "@/features/products/index/product-index-builder";
import type {
  CollectionIndexFile,
  FacetIndexFile,
  IndexedProductListingRecord,
  ProductListingIndexFile,
  SearchTokenIndexFile,
  SlugPathIndexFile,
} from "@/features/products/index/product-index-types";
import type { ListingFacets } from "@/features/products/listing/types";

const gunzipAsync = promisify(gunzip);

export function useProductListingIndex(): boolean {
  if (process.env.USE_PRODUCT_LISTING_INDEX === "false") return false;
  return true;
}

type ListingCacheRow = {
  signature: string;
  records: IndexedProductListingRecord[];
  currency: string;
  priceBounds: { min: number; max: number };
};

const listingMemoryCache = new Map<string, ListingCacheRow>();
const facetMemoryCache = new Map<string, FacetIndexFile>();
const collectionIndexCache = new Map<string, CollectionIndexFile>();
const searchIndexCache = new Map<string, SearchTokenIndexFile>();
const slugPathCache = new Map<string, SlugPathIndexFile>();

async function fileExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

async function readJsonFile<T>(absPath: string): Promise<T | null> {
  try {
    const raw = await readFile(absPath, "utf-8");
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

async function readMaybeGzippedJson<T>(jsonPath: string, gzPath: string): Promise<T | null> {
  if (await fileExists(gzPath)) {
    try {
      const buf = await readFile(gzPath);
      const raw = await gunzipAsync(buf);
      return JSON.parse(raw.toString("utf-8")) as T;
    } catch {
      /* fall through to plain json */
    }
  }
  return readJsonFile<T>(jsonPath);
}

function localeKey(localePrefix: string): CatalogLocale {
  return urlPrefixToCatalogLocale(localePrefix);
}

async function loadListingIndexFile(locale: CatalogLocale): Promise<ProductListingIndexFile | null> {
  const dir = localeIndexDir(locale);
  const jsonPath = join(dir, "product-listing-index.json");
  const gzPath = `${jsonPath}.gz`;
  return readMaybeGzippedJson<ProductListingIndexFile>(jsonPath, gzPath);
}

async function loadListingIndexUncached(
  localePrefix: string,
): Promise<ListingCacheRow | null> {
  const locale = localeKey(localePrefix);
  const parsed = await loadListingIndexFile(locale);
  if (!parsed?.records) return null;

  const row: ListingCacheRow = {
    signature: parsed.sourceSignature,
    records: parsed.records,
    currency: parsed.currency,
    priceBounds: parsed.priceBounds,
  };
  listingMemoryCache.set(locale, row);
  return row;
}

export const loadListingRecords = cache(async function loadListingRecords(
  localePrefix: string,
): Promise<IndexedProductListingRecord[]> {
  if (!useProductListingIndex()) return [];

  const locale = localeKey(localePrefix);
  const cached = listingMemoryCache.get(locale);
  if (cached) return cached.records;

  const row = await loadListingIndexUncached(localePrefix);
  return row?.records ?? [];
});

export async function hasProductListingIndex(localePrefix: string): Promise<boolean> {
  const locale = localeKey(localePrefix);
  const jsonPath = join(localeIndexDir(locale), "product-listing-index.json");
  return fileExists(jsonPath);
}

export async function loadFacetIndex(
  localePrefix: string,
  scope: "global" | string = "global",
): Promise<ListingFacets | null> {
  if (!useProductListingIndex()) return null;

  const locale = localeKey(localePrefix);
  let facetFile = facetMemoryCache.get(locale);
  if (!facetFile) {
    const path = join(localeIndexDir(locale), "facet-index.json");
    facetFile = (await readJsonFile<FacetIndexFile>(path)) ?? undefined;
    if (facetFile) facetMemoryCache.set(locale, facetFile);
  }
  if (!facetFile) return null;

  if (scope === "global") return facetFile.global;
  const scoped = facetFile.byCollection[scope];
  if (!scoped) return facetFile.global;
  return {
    collections: facetFile.global.collections,
    categories: scoped.categories ?? facetFile.global.categories,
    brands: scoped.brands ?? facetFile.global.brands,
    tags: scoped.tags ?? facetFile.global.tags,
    conditions: scoped.conditions ?? facetFile.global.conditions,
    variations: scoped.variations ?? facetFile.global.variations,
    priceMin: scoped.priceMin ?? facetFile.global.priceMin,
    priceMax: scoped.priceMax ?? facetFile.global.priceMax,
    currency: scoped.currency ?? facetFile.global.currency,
  };
}

export async function loadCollectionSlugIndex(
  localePrefix: string,
  collectionSlug: string,
): Promise<Set<string> | null> {
  if (!useProductListingIndex()) return null;

  const locale = localeKey(localePrefix);
  let colIndex = collectionIndexCache.get(locale);
  if (!colIndex) {
    const path = join(localeIndexDir(locale), "collection-index.json");
    colIndex = (await readJsonFile<CollectionIndexFile>(path)) ?? undefined;
    if (colIndex) collectionIndexCache.set(locale, colIndex);
  }
  if (!colIndex) return null;

  const slugs = colIndex.collections[collectionSlug];
  return slugs?.length ? new Set(slugs) : null;
}

export async function searchTokenLookup(
  localePrefix: string,
  query: string,
): Promise<Set<string> | null> {
  const q = query.trim().toLowerCase();
  if (!q || !useProductListingIndex()) return null;

  const locale = localeKey(localePrefix);
  let searchIndex = searchIndexCache.get(locale);
  if (!searchIndex) {
    const path = join(localeIndexDir(locale), "search-token-index.json");
    searchIndex = (await readJsonFile<SearchTokenIndexFile>(path)) ?? undefined;
    if (searchIndex) searchIndexCache.set(locale, searchIndex);
  }
  if (!searchIndex) return null;

  const tokens = q
    .replace(/[^-\p{L}\p{N}]+/gu, " ")
    .split(/\s+/)
    .filter((t) => t.length >= 2);

  if (tokens.length === 0) return null;

  let result: Set<string> | undefined;
  for (const token of tokens) {
    const hits = searchIndex.tokens[token];
    if (!hits?.length) continue;
    const hitSet = new Set(hits);
    if (!result) {
      result = hitSet;
    } else {
      const next = new Set<string>();
      for (const slug of result) {
        if (hitSet.has(slug)) next.add(slug);
      }
      result = next;
    }
  }
  return result && result.size > 0 ? result : null;
}

export async function loadSlugPathIndex(
  localePrefix: string,
): Promise<SlugPathIndexFile | null> {
  if (!useProductListingIndex()) return null;

  const locale = localeKey(localePrefix);
  let pathIndex = slugPathCache.get(locale);
  if (!pathIndex) {
    const path = join(localeIndexDir(locale), "slug-path-index.json");
    pathIndex = (await readJsonFile<SlugPathIndexFile>(path)) ?? undefined;
    if (pathIndex) slugPathCache.set(locale, pathIndex);
  }
  return pathIndex ?? null;
}

export function invalidateProductIndexLoaderCache(): void {
  listingMemoryCache.clear();
  facetMemoryCache.clear();
  collectionIndexCache.clear();
  searchIndexCache.clear();
  slugPathCache.clear();
}

export function productIndexManifestPath(): string {
  return join(productsIndexRoot(), "manifest.json");
}
