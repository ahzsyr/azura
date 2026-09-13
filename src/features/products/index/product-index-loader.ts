import "server-only";

import { cache } from "react";
import { access, readFile } from "node:fs/promises";
import { gunzip } from "node:zlib";
import { promisify } from "node:util";
import { join, sep } from "node:path";
import { prefixToCatalogLocaleCode } from "@/features/catalog/locales";
import {
  localeIndexDir,
  productsIndexRoot,
  warmDbProductIndexCaches,
} from "@/features/products/index/product-index-builder";
import type {
  CollectionIndexFile,
  FacetIndexFile,
  InvertedFacetIndexFile,
  IndexedProductListingRecord,
  ProductListingIndexFile,
  SearchTokenIndexFile,
  SlugPathIndexFile,
} from "@/features/products/index/product-index-types";
import type { ListingFacets } from "@/features/products/listing/types";
import { normalizeRemoteImageUrl } from "@/lib/config/next-image";
import {
  productExistsInOverlay,
  listJsonStoreProducts,
} from "@/features/products/products-persistence";
import { recordFromProduct } from "@/features/products/listing/record-from-product";
import { loadCollectionsFromDisk } from "@/features/collections/collection-sync.service";
import { orderCollectionsHierarchy } from "@/features/collections/collection-hierarchy";
import { catalogSeedRoot } from "@/lib/catalog-seed-paths";
import { useCatalogProductsDb } from "@/features/products/products-source";
import { loadListingRecordsFromDb } from "@/features/products/db/product-listing-loader";
import { readSiteSettings } from "@/features/catalog/site-settings.service";
import { tokenizeForSearch } from "@/capabilities/search/core/text";

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
const invertedFacetMemoryCache = new Map<string, InvertedFacetIndexFile>();
const collectionIndexCache = new Map<string, CollectionIndexFile>();
const searchIndexCache = new Map<string, SearchTokenIndexFile>();
const slugPathCache = new Map<string, SlugPathIndexFile>();
const dbWarmInFlight = new Map<string, Promise<void>>();

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

async function localeKey(localePrefix: string): Promise<string> {
  return prefixToCatalogLocaleCode(localePrefix);
}

async function ensureDbIndexCachesWarm(locale: string, localePrefix: string): Promise<void> {
  if (
    facetMemoryCache.has(locale) &&
    invertedFacetMemoryCache.has(locale) &&
    collectionIndexCache.has(locale) &&
    searchIndexCache.has(locale)
  ) {
    return;
  }
  let inflight = dbWarmInFlight.get(locale);
  if (!inflight) {
    inflight = warmDbProductIndexCaches(locale, localePrefix).finally(() => {
      dbWarmInFlight.delete(locale);
    });
    dbWarmInFlight.set(locale, inflight);
  }
  await inflight;
}

/** Product counts per collection slug from the warmed in-memory collection index. */
export async function loadAllCollectionProductCounts(
  localePrefix: string,
  slugs: string[],
): Promise<Map<string, number>> {
  const counts = new Map<string, number>();
  if (!useProductListingIndex()) return counts;

  const locale = await localeKey(localePrefix);
  if (useCatalogProductsDb()) {
    await ensureDbIndexCachesWarm(locale, localePrefix);
  } else {
    let colIndex = collectionIndexCache.get(locale);
    if (!colIndex) {
      const path = join(localeIndexDir(locale), "collection-index.json");
      colIndex = (await readJsonFile<CollectionIndexFile>(path)) ?? undefined;
      if (colIndex) collectionIndexCache.set(locale, colIndex);
    }
  }

  const colIndex = collectionIndexCache.get(locale);
  for (const slug of slugs) {
    const list = colIndex?.collections[slug];
    counts.set(slug, list?.length ?? 0);
  }
  return counts;
}

export function applyProductIndexCaches(
  locale: string,
  built: {
    listingIndex: ProductListingIndexFile;
    facetIndex: FacetIndexFile;
    invertedFacetIndex?: InvertedFacetIndexFile;
    collectionIndex: CollectionIndexFile;
    searchIndex: SearchTokenIndexFile;
    slugPathIndex: SlugPathIndexFile;
  },
): void {
  const records = built.listingIndex.records.map(normalizeIndexedListingRecord);
  listingMemoryCache.set(locale, {
    signature: built.listingIndex.sourceSignature,
    records,
    currency: built.listingIndex.currency,
    priceBounds: built.listingIndex.priceBounds,
  });
  facetMemoryCache.set(locale, built.facetIndex);
  if (built.invertedFacetIndex) invertedFacetMemoryCache.set(locale, built.invertedFacetIndex);
  collectionIndexCache.set(locale, built.collectionIndex);
  searchIndexCache.set(locale, built.searchIndex);
  slugPathCache.set(locale, built.slugPathIndex);
}

function normalizeIndexedListingRecord(
  record: IndexedProductListingRecord,
): IndexedProductListingRecord {
  const primary_image = normalizeRemoteImageUrl(record.primary_image);
  const secondary_image = normalizeRemoteImageUrl(record.secondary_image);
  if (primary_image === record.primary_image && secondary_image === record.secondary_image) {
    return record;
  }
  return { ...record, primary_image, secondary_image };
}

async function loadListingIndexFile(locale: string): Promise<ProductListingIndexFile | null> {
  const dir = localeIndexDir(locale);
  const jsonPath = join(dir, "product-listing-index.json");
  const gzPath = `${jsonPath}.gz`;
  return readMaybeGzippedJson<ProductListingIndexFile>(jsonPath, gzPath);
}

async function filterListingRecordsToFilesystem(
  locale: string,
  records: IndexedProductListingRecord[],
): Promise<IndexedProductListingRecord[]> {
  if (records.length === 0) return records;

  const pathIndex = await loadSlugPathIndexInternal(locale);
  const dataRoot = catalogSeedRoot();
  const filtered: IndexedProductListingRecord[] = [];

  for (const record of records) {
    const relPath =
      pathIndex?.paths[record.slug] ?? `${locale}/products/${record.slug}.json`;
    const absPath = join(dataRoot, relPath.replace(/\//g, sep));
    if ((await fileExists(absPath)) || (await productExistsInOverlay(locale, record.slug))) {
      filtered.push(record);
    }
  }

  if (
    process.env.NODE_ENV === "development" &&
    filtered.length !== records.length
  ) {
    console.warn(
      `[catalog:index] ${locale}: filtered ${records.length - filtered.length} orphan listing index entries at runtime`,
    );
  }

  return filtered;
}

async function mergeJsonStoreListingRecords(
  locale: string,
  records: IndexedProductListingRecord[],
): Promise<IndexedProductListingRecord[]> {
  const overlays = await listJsonStoreProducts(locale);
  if (overlays.length === 0) return records;

  const collections = orderCollectionsHierarchy(
    (await loadCollectionsFromDisk()).filter((c) => c.visible !== false),
  );
  const site = await readSiteSettings(locale);
  const seen = new Set(records.map((r) => r.slug.toLowerCase()));
  const merged = [...records];

  for (const { slug, product } of overlays) {
    const key = slug.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    const record = recordFromProduct(product, slug, collections, { site });
    merged.push({
      ...record,
      updatedAt: new Date().toISOString(),
    });
  }

  if (merged.length === records.length) return records;

  merged.sort((a, b) => a.slug.localeCompare(b.slug, undefined, { sensitivity: "base" }));
  return merged;
}

async function loadSlugPathIndexInternal(
  locale: string,
): Promise<SlugPathIndexFile | null> {
  let pathIndex = slugPathCache.get(locale);
  if (!pathIndex && !useCatalogProductsDb()) {
    const path = join(localeIndexDir(locale), "slug-path-index.json");
    pathIndex = (await readJsonFile<SlugPathIndexFile>(path)) ?? undefined;
    if (pathIndex) slugPathCache.set(locale, pathIndex);
  }
  return pathIndex ?? null;
}

async function loadListingIndexUncached(
  localePrefix: string,
): Promise<ListingCacheRow | null> {
  const locale = await localeKey(localePrefix);
  const parsed = await loadListingIndexFile(locale);
  if (!parsed?.records) return null;

  const rawRecords = parsed.records.map(normalizeIndexedListingRecord);
  const filesystemRecords = await filterListingRecordsToFilesystem(locale, rawRecords);
  const records = await mergeJsonStoreListingRecords(locale, filesystemRecords);

  const row: ListingCacheRow = {
    signature: parsed.sourceSignature,
    records,
    currency: parsed.currency,
    priceBounds: parsed.priceBounds,
  };
  listingMemoryCache.set(locale, row);
  return row;
}

async function loadDbListingRecords(localePrefix: string): Promise<IndexedProductListingRecord[]> {
  const locale = await localeKey(localePrefix);
  const cached = listingMemoryCache.get(locale);
  if (cached && cached.records.length > 0) return cached.records;

  await ensureDbIndexCachesWarm(locale, localePrefix);
  const warmed = listingMemoryCache.get(locale);
  if (warmed && warmed.records.length > 0) return warmed.records;

  const fromDb = await loadListingRecordsFromDb(localePrefix);
  if (fromDb.length > 0 && !warmed) {
    listingMemoryCache.set(locale, {
      signature: `db-fallback:${fromDb.length}`,
      records: fromDb,
      currency: fromDb[0]?.price.currency ?? "USD",
      priceBounds: {
        min: fromDb.reduce((min, r) => Math.min(min, r.priceMin), Infinity) || 0,
        max: fromDb.reduce((max, r) => Math.max(max, r.priceMax), 0),
      },
    });
  }
  return fromDb;
}

export const loadListingRecords = cache(async function loadListingRecords(
  localePrefix: string,
): Promise<IndexedProductListingRecord[]> {
  if (useCatalogProductsDb()) {
    return loadDbListingRecords(localePrefix);
  }

  if (!useProductListingIndex()) return [];

  const locale = await localeKey(localePrefix);
  const cached = listingMemoryCache.get(locale);
  if (cached) return cached.records;

  const row = await loadListingIndexUncached(localePrefix);
  return row?.records ?? [];
});

/** Load listing records for a set of product slugs from the warmed index cache. */
export async function loadListingRecordsForSlugs(
  localePrefix: string,
  slugs: Set<string>,
): Promise<IndexedProductListingRecord[]> {
  if (slugs.size === 0) return [];
  const records = await loadListingRecords(localePrefix);
  const bySlug = new Map(records.map((r) => [r.slug, r]));
  const out: IndexedProductListingRecord[] = [];
  for (const slug of slugs) {
    const hit = bySlug.get(slug);
    if (hit) out.push(hit);
  }
  return out;
}

export async function hasProductListingIndex(localePrefix: string): Promise<boolean> {
  if (useCatalogProductsDb()) return true;

  const locale = await localeKey(localePrefix);
  const jsonPath = join(localeIndexDir(locale), "product-listing-index.json");
  return fileExists(jsonPath);
}

export async function loadFacetIndex(
  localePrefix: string,
  scope: "global" | string = "global",
): Promise<ListingFacets | null> {
  if (!useProductListingIndex()) return null;

  const locale = await localeKey(localePrefix);
  if (useCatalogProductsDb()) {
    await ensureDbIndexCachesWarm(locale, localePrefix);
  }

  let facetFile = facetMemoryCache.get(locale);
  if (!facetFile && !useCatalogProductsDb()) {
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

  const locale = await localeKey(localePrefix);
  if (useCatalogProductsDb()) {
    await ensureDbIndexCachesWarm(locale, localePrefix);
  }

  let colIndex = collectionIndexCache.get(locale);
  if (!colIndex && !useCatalogProductsDb()) {
    const path = join(localeIndexDir(locale), "collection-index.json");
    colIndex = (await readJsonFile<CollectionIndexFile>(path)) ?? undefined;
    if (colIndex) collectionIndexCache.set(locale, colIndex);
  }
  if (!colIndex) return null;

  const slugs = colIndex.collections[collectionSlug];
  return slugs?.length ? new Set(slugs) : null;
}

export async function loadInvertedFacetIndex(
  localePrefix: string,
): Promise<InvertedFacetIndexFile | null> {
  if (!useProductListingIndex()) return null;

  const locale = await localeKey(localePrefix);
  if (useCatalogProductsDb()) {
    await ensureDbIndexCachesWarm(locale, localePrefix);
  }

  let index = invertedFacetMemoryCache.get(locale);
  if (!index && !useCatalogProductsDb()) {
    const path = join(localeIndexDir(locale), "inverted-facet-index.json");
    index = (await readJsonFile<InvertedFacetIndexFile>(path)) ?? undefined;
    if (index) invertedFacetMemoryCache.set(locale, index);
  }
  return index ?? null;
}

export async function searchTokenLookup(
  localePrefix: string,
  query: string,
): Promise<Set<string> | null> {
  const tokens = tokenizeForSearch(query);
  if (tokens.length === 0 || !useProductListingIndex()) return null;

  const locale = await localeKey(localePrefix);
  if (useCatalogProductsDb()) {
    await ensureDbIndexCachesWarm(locale, localePrefix);
  }

  let searchIndex = searchIndexCache.get(locale);
  if (!searchIndex && !useCatalogProductsDb()) {
    const path = join(localeIndexDir(locale), "search-token-index.json");
    searchIndex = (await readJsonFile<SearchTokenIndexFile>(path)) ?? undefined;
    if (searchIndex) searchIndexCache.set(locale, searchIndex);
  }
  if (!searchIndex) return null;

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

  const locale = await localeKey(localePrefix);
  return loadSlugPathIndexInternal(locale);
}

export function invalidateProductIndexLoaderCache(): void {
  listingMemoryCache.clear();
  facetMemoryCache.clear();
  invertedFacetMemoryCache.clear();
  collectionIndexCache.clear();
  searchIndexCache.clear();
  slugPathCache.clear();
}

export function productIndexManifestPath(): string {
  return join(productsIndexRoot(), "manifest.json");
}
