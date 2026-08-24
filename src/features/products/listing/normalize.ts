import { LISTING_PER_OPTIONS, type ListingFilterState, type ListingPerPage } from "./types";
import { filterStateToApiSearchParams } from "./url-state";

const DEFAULT_PER: ListingPerPage = 20;

/**
 * Trim, drop empties, dedupe (first-seen wins), stable-sort.
 * Does NOT case-fold — use for brands/categories/collections/conditions/variations
 * where the oracle matches with exact string equality.
 */
function normalizeExactFacetValues(values: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of values) {
    const v = raw.trim();
    if (!v || seen.has(v)) continue;
    seen.add(v);
    out.push(v);
  }
  return out.sort((a, b) => a.localeCompare(b));
}

/**
 * Tags: oracle uses case-insensitive matching (`normTag`).
 * Canonicalize to lowercase so duplicates collapse correctly.
 */
function normalizeTagValues(values: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of values) {
    const v = raw.trim().toLowerCase();
    if (!v || seen.has(v)) continue;
    seen.add(v);
    out.push(v);
  }
  return out.sort((a, b) => a.localeCompare(b));
}

function normalizeVariations(
  variations: Record<string, string[]>,
): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  const typeKeys = Object.keys(variations).sort((a, b) => a.localeCompare(b));
  for (const typeRaw of typeKeys) {
    const type = typeRaw.trim();
    if (!type) continue;
    const opts = normalizeExactFacetValues(variations[typeRaw] ?? []);
    if (opts.length === 0) continue;
    out[type] = opts;
  }
  return out;
}

function normalizePerPage(per: number): ListingPerPage {
  return (LISTING_PER_OPTIONS as readonly number[]).includes(per)
    ? (per as ListingPerPage)
    : DEFAULT_PER;
}

function normalizePrice(value: number | null): number | null {
  if (value == null || !Number.isFinite(value)) return null;
  return Math.max(0, value);
}

function tokenizeSearchQuery(q: string): string[] {
  return q
    .trim()
    .toLowerCase()
    .split(/[\s\-_/,.]+/)
    .map((t) => t.trim())
    .filter(Boolean);
}

/**
 * Normalize filter state for planning, caching, and stable comparisons.
 * Preserves oracle match semantics: brands/categories stay case-sensitive;
 * tags are lowercased to match case-insensitive tag matching.
 */
export function normalizeListingFilterState(state: ListingFilterState): ListingFilterState {
  let priceMin = normalizePrice(state.priceMin);
  let priceMax = normalizePrice(state.priceMax);
  if (priceMin != null && priceMax != null && priceMin > priceMax) {
    const tmp = priceMin;
    priceMin = priceMax;
    priceMax = tmp;
  }

  const logic = state.logic === "or" ? ("or" as const) : undefined;
  const collectionScope = state.collectionScope?.trim() || null;

  return {
    q: state.q.trim(),
    qExact: state.qExact === true ? true : undefined,
    categories: normalizeExactFacetValues(state.categories),
    brands: normalizeExactFacetValues(state.brands),
    collections: collectionScope ? [] : normalizeExactFacetValues(state.collections),
    collectionScope,
    tags: normalizeTagValues(state.tags),
    conditions: normalizeExactFacetValues(state.conditions),
    variations: normalizeVariations(state.variations),
    priceMin,
    priceMax,
    stockOnly: Boolean(state.stockOnly),
    page: Math.max(1, Number.isFinite(state.page) ? Math.floor(state.page) : 1),
    per: normalizePerPage(state.per),
    ...(logic ? { logic } : {}),
  };
}

export function normalizeSearchQuery(q: string): { normalized: string; tokens: string[] } {
  const normalized = q.trim().toLowerCase().replace(/\s+/g, " ");
  return { normalized, tokens: tokenizeSearchQuery(normalized) };
}

/**
 * Canonical serialization for cache keys / URL-skip comparisons.
 * Uses the same param encoding as the public API after normalization.
 */
export function serializeCanonicalFilterState(state: ListingFilterState): string {
  return filterStateToApiSearchParams(normalizeListingFilterState(state)).toString();
}
