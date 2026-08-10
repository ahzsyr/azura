import type { ProductListingCatalogPayload } from "../types";
import { serializeCanonicalFilterState } from "../normalize";
import type { ListingFilterState } from "../types";
import { PRODUCT_INDEX_VERSION } from "@/features/products/index/product-index-types";

export type ListingQueryCacheEntry = ProductListingCatalogPayload & {
  cachedAt: number;
  indexVersion: number;
};

type CacheKeyParts = {
  locale: string;
  listingMode: "product" | "collection";
  collectionSlug?: string | null;
  state: ListingFilterState;
  indexVersion?: number;
};

const DEFAULT_MAX = 200;

class ListingQueryLruCache {
  private map = new Map<string, ListingQueryCacheEntry>();
  private maxEntries: number;

  constructor(maxEntries = DEFAULT_MAX) {
    this.maxEntries = maxEntries;
  }

  get(key: string): ListingQueryCacheEntry | null {
    const hit = this.map.get(key);
    if (!hit) return null;
    // refresh LRU order
    this.map.delete(key);
    this.map.set(key, hit);
    return hit;
  }

  set(key: string, entry: ListingQueryCacheEntry): void {
    if (this.map.has(key)) this.map.delete(key);
    this.map.set(key, entry);
    while (this.map.size > this.maxEntries) {
      const oldest = this.map.keys().next().value;
      if (oldest === undefined) break;
      this.map.delete(oldest);
    }
  }

  clear(): void {
    this.map.clear();
  }

  get size(): number {
    return this.map.size;
  }
}

const globalCache = new ListingQueryLruCache();

export function buildListingQueryCacheKey(parts: CacheKeyParts): string {
  const version = parts.indexVersion ?? PRODUCT_INDEX_VERSION;
  const canonical = serializeCanonicalFilterState(parts.state);
  const collection = parts.collectionSlug?.trim() || "";
  return `listing:v${version}:${parts.locale}:${parts.listingMode}:${collection}:${canonical}`;
}

export function isListingQueryCacheEnabled(): boolean {
  return process.env.CATALOG_QUERY_CACHE === "1" || process.env.CATALOG_QUERY_CACHE === "true";
}

/** Aggressive admission for simple queries; skip deep unique combos. */
export function shouldCacheListingQuery(state: ListingFilterState): boolean {
  const dims =
    state.categories.length +
    state.brands.length +
    state.collections.length +
    state.tags.length +
    state.conditions.length +
    Object.values(state.variations).reduce((n, opts) => n + opts.length, 0);
  if (dims <= 2) return true;
  if (state.q.trim() && dims <= 1) return true;
  if (!state.q.trim() && dims <= 3 && !state.stockOnly) return true;
  return false;
}

export function getCachedListingQuery(key: string): ListingQueryCacheEntry | null {
  if (!isListingQueryCacheEnabled()) return null;
  return globalCache.get(key);
}

export function setCachedListingQuery(
  key: string,
  payload: ProductListingCatalogPayload,
  indexVersion = PRODUCT_INDEX_VERSION,
): void {
  if (!isListingQueryCacheEnabled()) return;
  globalCache.set(key, {
    ...payload,
    cachedAt: Date.now(),
    indexVersion,
  });
}

export function clearListingQueryCache(): void {
  globalCache.clear();
}

export function listingQueryCacheSize(): number {
  return globalCache.size;
}
