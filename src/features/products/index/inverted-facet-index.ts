import type { ListingFilterState, ProductListingRecord } from "@/features/products/listing/types";
import {
  PRODUCT_INDEX_SEMANTIC_VERSIONS,
  PRODUCT_INDEX_VERSION,
  type IndexedProductListingRecord,
  type InvertedFacetIndexFile,
} from "./product-index-types";

function norm(value: string): string {
  return value.trim().toLowerCase();
}

function facetKey(kind: string, value: string): string {
  return `${kind}:${norm(value)}`;
}

function variationKey(type: string, option: string): string {
  return `variation:${norm(type)}:${norm(option)}`;
}

function add(map: Map<string, Set<string>>, key: string, slug: string): void {
  if (!key || key.endsWith(":")) return;
  const bucket = map.get(key) ?? new Set<string>();
  bucket.add(slug);
  map.set(key, bucket);
}

export function buildInvertedFacetIndex(
  locale: string,
  records: IndexedProductListingRecord[],
): InvertedFacetIndexFile {
  const map = new Map<string, Set<string>>();

  for (const record of records) {
    const slug = record.slug;
    if (record.brand) add(map, facetKey("brand", record.brand), slug);
    if (record.category) add(map, facetKey("category", record.category), slug);
    for (const category of record.categories ?? []) add(map, facetKey("category", category), slug);
    for (const tag of record.tags ?? []) add(map, facetKey("tag", tag), slug);
    for (const condition of record.conditions ?? []) add(map, facetKey("condition", condition), slug);
    for (const collection of record.collectionSlugs ?? []) add(map, facetKey("collection", collection), slug);
    for (const [type, options] of Object.entries(record.variationFacets ?? {})) {
      for (const option of options) add(map, variationKey(type, option), slug);
    }
    if (record.in_stock) add(map, "stock:in_stock", slug);
  }

  const facets: Record<string, string[]> = {};
  for (const [key, slugs] of map) {
    facets[key] = [...slugs].sort();
  }

  return {
    version: PRODUCT_INDEX_VERSION,
    semanticVersions: PRODUCT_INDEX_SEMANTIC_VERSIONS,
    locale,
    facets,
  };
}

function intersectSlugSets(sets: string[][]): Set<string> | null {
  if (!sets.length) return null;
  const sorted = [...sets].sort((a, b) => a.length - b.length);
  let result = new Set(sorted[0]);
  for (const slugs of sorted.slice(1)) {
    const hitSet = new Set(slugs);
    result = new Set([...result].filter((slug) => hitSet.has(slug)));
    if (result.size === 0) break;
  }
  return result;
}

function unionForSelected(index: InvertedFacetIndexFile, keys: string[]): string[] | null {
  const out = new Set<string>();
  for (const key of keys) {
    for (const slug of index.facets[key] ?? []) out.add(slug);
  }
  return out.size ? [...out] : null;
}

export type InvertedFacetMatch = {
  slugs: Set<string> | null;
  reasonKeys: string[];
};

export function matchListingFacetSlugs(
  index: InvertedFacetIndexFile,
  state: ListingFilterState,
): InvertedFacetMatch {
  const dimensions: string[][] = [];
  const reasonKeys: string[] = [];

  const addDimension = (reason: string, keys: string[]) => {
    if (!keys.length) return;
    const union = unionForSelected(index, keys);
    reasonKeys.push(reason);
    dimensions.push(union ?? []);
  };

  addDimension("category", state.categories.map((value) => facetKey("category", value)));
  addDimension("brand", state.brands.map((value) => facetKey("brand", value)));
  addDimension("collection", state.collections.map((value) => facetKey("collection", value)));
  addDimension("tag", state.tags.map((value) => facetKey("tag", value)));
  addDimension("condition", state.conditions.map((value) => facetKey("condition", value)));

  for (const [type, selected] of Object.entries(state.variations)) {
    addDimension(
      `variation:${type}`,
      selected.map((option) => variationKey(type, option)),
    );
  }

  if (state.stockOnly) addDimension("stock", ["stock:in_stock"]);

  return {
    slugs: intersectSlugSets(dimensions),
    reasonKeys,
  };
}

export function filterRecordsBySlugSet<T extends ProductListingRecord>(
  records: T[],
  slugs: Set<string> | null,
): T[] {
  if (!slugs) return records;
  return records.filter((record) => slugs.has(record.slug));
}
