import type { SearchResult } from "@/capabilities/search/engine/types";
import { SEARCH_SEMANTIC_VERSION_KEY } from "@/capabilities/search/core/text";

type CacheEntry = {
  expiresAt: number;
  payload: SearchPaginatedPayload;
};

export type SearchPaginatedPayload = {
  items: SearchResult[];
  hasMore: boolean;
  total: number;
  isEstimate?: boolean;
};

const store = new Map<string, CacheEntry>();
const MAX_ENTRIES = 200;

let cacheHits = 0;
let cacheMisses = 0;

function prune(): void {
  if (store.size <= MAX_ENTRIES) return;
  const now = Date.now();
  for (const [k, v] of store) {
    if (v.expiresAt <= now) store.delete(k);
  }
  if (store.size <= MAX_ENTRIES) return;
  const sorted = [...store.entries()].sort((a, b) => a[1].expiresAt - b[1].expiresAt);
  for (const [k] of sorted.slice(0, store.size - MAX_ENTRIES)) {
    store.delete(k);
  }
}

/** Build a stable cache key with sorted object keys. */
export function buildSearchCacheKey(parts: Record<string, unknown>): string {
  const sorted: Record<string, unknown> = {
    __semantic: SEARCH_SEMANTIC_VERSION_KEY,
  };
  for (const key of Object.keys(parts).sort()) {
    sorted[key] = parts[key];
  }
  return JSON.stringify(sorted);
}

export function getCachedSearchResult(key: string): SearchPaginatedPayload | null {
  const entry = store.get(key);
  if (!entry) {
    cacheMisses++;
    return null;
  }
  if (entry.expiresAt <= Date.now()) {
    store.delete(key);
    cacheMisses++;
    return null;
  }
  cacheHits++;
  return entry.payload;
}

export function setCachedSearchResult(
  key: string,
  payload: SearchPaginatedPayload,
  ttlSec: number
): void {
  store.set(key, {
    expiresAt: Date.now() + ttlSec * 1000,
    payload,
  });
  prune();
}

export function clearSearchQueryCache(): void {
  store.clear();
  cacheHits = 0;
  cacheMisses = 0;
}

export function getSearchCacheStats(): { hits: number; misses: number; size: number } {
  return { hits: cacheHits, misses: cacheMisses, size: store.size };
}
