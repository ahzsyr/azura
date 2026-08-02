import { LISTING_PER_OPTIONS, type ListingFilterState, type ListingPerPage } from "./types";

const DEFAULT_PER: ListingPerPage = 20;

function parsePer(raw: string | null): ListingPerPage {
  const n = Number(raw ?? DEFAULT_PER);
  return (LISTING_PER_OPTIONS as readonly number[]).includes(n) ? (n as ListingPerPage) : DEFAULT_PER;
}

function parseNum(raw: string | null): number | null {
  if (raw == null || raw.trim() === "") return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

export function parseVariationParams(entries: string[]): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const entry of entries) {
    const idx = entry.indexOf(":");
    if (idx <= 0) continue;
    const type = entry.slice(0, idx).trim();
    const option = entry.slice(idx + 1).trim();
    if (!type || !option) continue;
    if (!out[type]) out[type] = [];
    if (!out[type].includes(option)) out[type].push(option);
  }
  return out;
}

export function filterStateFromSearchParams(params: URLSearchParams): ListingFilterState {
  return {
    q: params.get("q")?.trim() ?? "",
    categories: params.getAll("category").filter(Boolean),
    brands: params.getAll("brand").filter(Boolean),
    collections: params.getAll("collection").filter(Boolean),
    collectionScope: params.get("scope")?.trim() || null,
    tags: params.getAll("tag").filter(Boolean),
    conditions: params.getAll("condition").filter(Boolean),
    variations: parseVariationParams(params.getAll("var")),
    priceMin: parseNum(params.get("price_min")),
    priceMax: parseNum(params.get("price_max")),
    stockOnly: params.get("stock") === "in_stock",
    page: Math.max(1, Number(params.get("page") ?? 1) || 1),
    per: parsePer(params.get("per")),
  };
}

export function searchParamsFromFilterState(state: ListingFilterState, basePath: string): string {
  const params = new URLSearchParams();
  const q = state.q.trim();
  if (q) params.set("q", q);
  for (const c of state.categories) params.append("category", c);
  for (const b of state.brands) params.append("brand", b);
  if (state.collectionScope?.trim()) {
    params.set("scope", state.collectionScope.trim());
  } else {
    for (const col of state.collections) params.append("collection", col);
  }
  for (const tag of state.tags) params.append("tag", tag);
  for (const cond of state.conditions) params.append("condition", cond);
  for (const [type, opts] of Object.entries(state.variations)) {
    for (const opt of opts) params.append("var", `${type}:${opt}`);
  }
  if (state.priceMin != null) params.set("price_min", String(state.priceMin));
  if (state.priceMax != null) params.set("price_max", String(state.priceMax));
  if (state.stockOnly) params.set("stock", "in_stock");
  if (state.page > 1) params.set("page", String(state.page));
  if (state.per !== DEFAULT_PER) params.set("per", String(state.per));
  const qs = params.toString();
  return `${basePath}${qs ? `?${qs}` : ""}`;
}

export function filterStateToApiSearchParams(state: ListingFilterState): URLSearchParams {
  const params = new URLSearchParams();
  const q = state.q.trim();
  if (q) params.set("q", q);
  for (const c of state.categories) params.append("category", c);
  for (const b of state.brands) params.append("brand", b);
  if (state.collectionScope?.trim()) {
    params.set("scope", state.collectionScope.trim());
  } else {
    for (const col of state.collections) params.append("collection", col);
  }
  for (const tag of state.tags) params.append("tag", tag);
  for (const cond of state.conditions) params.append("condition", cond);
  for (const [type, opts] of Object.entries(state.variations)) {
    for (const opt of opts) params.append("var", `${type}:${opt}`);
  }
  if (state.priceMin != null) params.set("price_min", String(state.priceMin));
  if (state.priceMax != null) params.set("price_max", String(state.priceMax));
  if (state.stockOnly) params.set("stock", "in_stock");
  if (state.page > 1) params.set("page", String(state.page));
  if (state.per !== DEFAULT_PER) params.set("per", String(state.per));
  return params;
}

export function countActiveFilters(state: ListingFilterState): number {
  let n = 0;
  if (state.q.trim()) n += 1;
  n += state.categories.length;
  n += state.brands.length;
  if (state.collectionScope?.trim()) {
    n += 1;
  } else {
    n += state.collections.length;
  }
  n += state.tags.length;
  n += state.conditions.length;
  for (const opts of Object.values(state.variations)) n += opts.length;
  if (state.priceMin != null || state.priceMax != null) n += 1;
  if (state.stockOnly) n += 1;
  return n;
}

/** True when filter state matches the default listing view (page 1, no filters). */
export function isDefaultListingFilterState(state: ListingFilterState): boolean {
  return (
    countActiveFilters(state) === 0 &&
    state.page === 1 &&
    state.per === DEFAULT_PER
  );
}

/** True for the first page with no active filters (ignores page size). */
export function isUnfilteredListingView(state: ListingFilterState): boolean {
  return countActiveFilters(state) === 0 && state.page === 1;
}

export function listingFilterStateKey(state: ListingFilterState): string {
  return filterStateToApiSearchParams(state).toString();
}