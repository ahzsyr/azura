import {
  createLoader,
  createMultiParser,
  createParser,
  createSerializer,
  parseAsFloat,
  parseAsNumberLiteral,
  parseAsString,
  parseAsStringLiteral,
  type UrlKeys,
} from "nuqs/server";
import { LISTING_PER_OPTIONS, type ListingFilterState, type ListingPerPage } from "./types";

const DEFAULT_PER: ListingPerPage = 20;

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

function serializeVariationParams(variations: Record<string, string[]>): string[] {
  const out: string[] = [];
  for (const [type, opts] of Object.entries(variations)) {
    for (const opt of opts) out.push(`${type}:${opt}`);
  }
  return out;
}

function variationsEqual(a: Record<string, string[]>, b: Record<string, string[]>): boolean {
  return serializeVariationParams(a).join("\0") === serializeVariationParams(b).join("\0");
}

function stringArrayEqual(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  return a.every((value, index) => value === b[index]);
}

const parseAsTrimmedStringArray = createMultiParser<string[]>({
  parse: (values) => values.map((value) => value.trim()).filter(Boolean),
  serialize: (values) => values,
  eq: stringArrayEqual,
}).withDefault([]);

const parseAsPage = createParser({
  parse: (raw) => {
    const n = Number(raw);
    if (!Number.isFinite(n)) return null;
    return Math.max(1, Math.floor(n) || 1);
  },
  serialize: (value) => String(value),
}).withDefault(1);

const parseAsQExact = createParser({
  parse: (raw) => (raw === "1" ? true : null),
  serialize: (value) => (value ? "1" : ""),
  eq: (a, b) => Boolean(a) === Boolean(b),
});

const parseAsStockOnly = createParser({
  parse: (raw) => (raw === "in_stock" ? true : null),
  serialize: () => "in_stock",
  eq: (a, b) => Boolean(a) === Boolean(b),
}).withDefault(false);

const parseAsCollectionScope = createParser({
  parse: (raw) => {
    const trimmed = raw.trim();
    return trimmed.length > 0 ? trimmed : null;
  },
  serialize: (value) => value,
});

const parseAsNullableFloat = createParser({
  parse: (raw) => parseNum(raw),
  serialize: (value) => String(value),
});

const parseAsVariations = createMultiParser<Record<string, string[]>>({
  parse: (values) => parseVariationParams([...values]),
  serialize: serializeVariationParams,
  eq: variationsEqual,
}).withDefault({});

/** Shared nuqs parsers for catalog listing filter query keys. */
export const listingFilterParsers = {
  q: parseAsString.withDefault(""),
  qExact: parseAsQExact,
  categories: parseAsTrimmedStringArray,
  brands: parseAsTrimmedStringArray,
  collections: parseAsTrimmedStringArray,
  collectionScope: parseAsCollectionScope,
  tags: parseAsTrimmedStringArray,
  conditions: parseAsTrimmedStringArray,
  variations: parseAsVariations,
  priceMin: parseAsNullableFloat,
  priceMax: parseAsNullableFloat,
  stockOnly: parseAsStockOnly,
  page: parseAsPage,
  per: parseAsNumberLiteral(LISTING_PER_OPTIONS).withDefault(DEFAULT_PER),
  logic: parseAsStringLiteral(["or"] as const),
};

export const listingFilterUrlKeys: UrlKeys<typeof listingFilterParsers> = {
  qExact: "q_exact",
  categories: "category",
  brands: "brand",
  collections: "collection",
  collectionScope: "scope",
  tags: "tag",
  conditions: "condition",
  variations: "var",
  priceMin: "price_min",
  priceMax: "price_max",
  stockOnly: "stock",
};

export type ListingFilterQueryValues = {
  q: string;
  qExact: boolean | null;
  categories: string[];
  brands: string[];
  collections: string[];
  collectionScope: string | null;
  tags: string[];
  conditions: string[];
  variations: Record<string, string[]>;
  priceMin: number | null;
  priceMax: number | null;
  stockOnly: boolean;
  page: number;
  per: ListingPerPage;
  logic: "or" | null;
};

export function toListingFilterState(values: ListingFilterQueryValues): ListingFilterState {
  return {
    q: values.q.trim(),
    ...(values.qExact ? { qExact: true as const } : {}),
    categories: values.categories,
    brands: values.brands,
    collections: values.collections,
    collectionScope: values.collectionScope?.trim() || null,
    tags: values.tags,
    conditions: values.conditions,
    variations: values.variations,
    priceMin: values.priceMin,
    priceMax: values.priceMax,
    stockOnly: values.stockOnly,
    page: values.page,
    per: values.per,
    ...(values.logic === "or" ? { logic: "or" as const } : {}),
  };
}

export function fromListingFilterState(
  state: ListingFilterState,
): Partial<{
  [K in keyof ListingFilterQueryValues]: ListingFilterQueryValues[K] | null;
}> {
  return {
    q: state.q.trim(),
    qExact: state.qExact === true ? true : null,
    categories: state.categories,
    brands: state.brands,
    collections: state.collections,
    collectionScope: state.collectionScope?.trim() || null,
    tags: state.tags,
    conditions: state.conditions,
    variations: state.variations,
    priceMin: state.priceMin,
    priceMax: state.priceMax,
    stockOnly: state.stockOnly,
    page: state.page,
    per: state.per,
    logic: state.logic === "or" ? "or" : null,
  };
}

const loadListingFilterQuery = createLoader(listingFilterParsers, {
  urlKeys: listingFilterUrlKeys,
});

const serializeListingFilterQuery = createSerializer(listingFilterParsers, {
  urlKeys: listingFilterUrlKeys,
});

export function filterStateFromSearchParams(params: URLSearchParams): ListingFilterState {
  return toListingFilterState(loadListingFilterQuery(params) as ListingFilterQueryValues);
}

export function searchParamsFromFilterState(state: ListingFilterState, basePath: string): string {
  return serializeListingFilterQuery(basePath, fromListingFilterState(state));
}

export function filterStateToApiSearchParams(state: ListingFilterState): URLSearchParams {
  const serialized = serializeListingFilterQuery(fromListingFilterState(state));
  const qs = serialized.startsWith("?") ? serialized.slice(1) : serialized.replace(/^\?/, "");
  // createSerializer may return "" or "?..." or a path-prefixed string when no base is given.
  if (!qs) return new URLSearchParams();
  if (qs.includes("://") || qs.startsWith("/")) {
    return new URL(qs, "https://example.local").searchParams;
  }
  return new URLSearchParams(qs);
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
