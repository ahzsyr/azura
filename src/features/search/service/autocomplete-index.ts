import { SEARCH_SEMANTIC_VERSION_KEY } from "@/features/search/core/text";

type AutocompleteCacheEntry<T> = {
  expiresAt: number;
  payload: T;
};

const autocompleteCache = new Map<string, AutocompleteCacheEntry<unknown>>();
const MAX_AUTOCOMPLETE_CACHE_ENTRIES = 200;
const AUTOCOMPLETE_CACHE_TTL_MS = 60_000;

export function buildAutocompleteCacheKey(parts: Record<string, unknown>): string {
  const sorted: Record<string, unknown> = {
    __semantic: SEARCH_SEMANTIC_VERSION_KEY,
  };
  for (const key of Object.keys(parts).sort()) {
    sorted[key] = parts[key];
  }
  return JSON.stringify(sorted);
}

export function getMaterializedAutocomplete<T>(key: string): T | null {
  const hit = autocompleteCache.get(key);
  if (!hit) return null;
  if (hit.expiresAt <= Date.now()) {
    autocompleteCache.delete(key);
    return null;
  }
  return hit.payload as T;
}

export function setMaterializedAutocomplete<T>(key: string, payload: T): void {
  autocompleteCache.set(key, {
    expiresAt: Date.now() + AUTOCOMPLETE_CACHE_TTL_MS,
    payload,
  });
  if (autocompleteCache.size <= MAX_AUTOCOMPLETE_CACHE_ENTRIES) return;
  const oldest = autocompleteCache.keys().next().value;
  if (oldest) autocompleteCache.delete(oldest);
}

export function clearMaterializedAutocomplete(): void {
  autocompleteCache.clear();
}
