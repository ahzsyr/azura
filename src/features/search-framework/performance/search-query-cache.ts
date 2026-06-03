import type { SearchResult } from "@/features/search-framework/types";

type CacheEntry = {
  expiresAt: number;
  payload: SearchPaginatedPayload;
};

export type SearchPaginatedPayload = {
  items: SearchResult[];
  hasMore: boolean;
  total: number;
};

const store = new Map<string, CacheEntry>();
const MAX_ENTRIES = 200;

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

export function buildSearchCacheKey(parts: Record<string, unknown>): string {
  return JSON.stringify(parts);
}

export function getCachedSearchResult(key: string): SearchPaginatedPayload | null {
  const entry = store.get(key);
  if (!entry) return null;
  if (entry.expiresAt <= Date.now()) {
    store.delete(key);
    return null;
  }
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
}
