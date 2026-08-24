import {
  buildCategoryFacetIndex,
  isCategoryTaxonomyNodeVisible,
  resolveCategoriesForProductFacet,
  type CategoryTaxonomyNode,
} from "@/features/categories/resolve-category-for-facet";
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
  taxonomy?: CategoryTaxonomyNode[],
): InvertedFacetIndexFile {
  const map = new Map<string, Set<string>>();
  const taxonomyIndex = taxonomy?.length ? buildCategoryFacetIndex(taxonomy) : null;

  for (const record of records) {
    const slug = record.slug;
    if (record.brand) add(map, facetKey("brand", record.brand), slug);
    if (record.category) add(map, facetKey("category", record.category), slug);
    for (const category of record.categories ?? []) add(map, facetKey("category", category), slug);
    // Also index settings Category name/slug so FILTERS values (settings-owned) match
    if (taxonomyIndex) {
      const hits = resolveCategoriesForProductFacet(
        {
          value: record.category,
          categoryIds: record.categoryIds,
          collectionSlugs: record.collectionSlugs,
        },
        taxonomyIndex,
      ).filter(isCategoryTaxonomyNodeVisible);
      for (const node of hits) {
        if (node.name) add(map, facetKey("category", node.name), slug);
        if (node.slug) add(map, facetKey("category", node.slug), slug);
      }
    }
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

function unionSlugSets(sets: string[][]): Set<string> | null {
  if (!sets.length) return null;
  const out = new Set<string>();
  for (const slugs of sets) {
    for (const slug of slugs) out.add(slug);
  }
  return out;
}

function unionForSelected(index: InvertedFacetIndexFile, keys: string[]): string[] {
  const out = new Set<string>();
  for (const key of keys) {
    for (const slug of index.facets[key] ?? []) out.add(slug);
  }
  return [...out];
}

export type InvertedFacetMatch = {
  slugs: Set<string> | null;
  reasonKeys: string[];
};

/**
 * Narrow candidates via inverted facet postings.
 * Within a dimension values are OR'd; across dimensions AND (default) or OR (`logic=or`).
 * Stock is NOT applied here — always AND'd by the query engine / oracle after facet algebra.
 */
export function matchListingFacetSlugs(
  index: InvertedFacetIndexFile,
  state: ListingFilterState,
): InvertedFacetMatch {
  const dimensions: string[][] = [];
  const reasonKeys: string[] = [];

  const addDimension = (reason: string, keys: string[]) => {
    if (!keys.length) return;
    reasonKeys.push(reason);
    dimensions.push(unionForSelected(index, keys));
  };

  addDimension("category", state.categories.map((value) => facetKey("category", value)));
  addDimension("brand", state.brands.map((value) => facetKey("brand", value)));
  addDimension("collection", state.collections.map((value) => facetKey("collection", value)));
  addDimension("tag", state.tags.map((value) => facetKey("tag", value)));
  addDimension("condition", state.conditions.map((value) => facetKey("condition", value)));

  const varEntries = Object.entries(state.variations).filter(([, selected]) => selected.length > 0);
  if (varEntries.length > 0) {
    if (state.logic === "or") {
      const typeUnions: string[][] = [];
      for (const [type, selected] of varEntries) {
        typeUnions.push(unionForSelected(index, selected.map((option) => variationKey(type, option))));
      }
      reasonKeys.push("variation");
      dimensions.push([...(unionSlugSets(typeUnions) ?? new Set())]);
    } else {
      let combined: Set<string> | null = null;
      for (const [type, selected] of varEntries) {
        const typeSet = new Set(
          unionForSelected(index, selected.map((option) => variationKey(type, option))),
        );
        if (combined == null) {
          combined = typeSet;
        } else {
          const next = new Set<string>();
          for (const slug of combined) {
            if (typeSet.has(slug)) next.add(slug);
          }
          combined = next;
        }
      }
      reasonKeys.push("variation");
      dimensions.push(combined ? [...combined] : []);
    }
  }

  if (!dimensions.length) {
    return { slugs: null, reasonKeys };
  }

  // Selectivity-aware ordering for AND intersects.
  const ordered = [...dimensions].sort((a, b) => a.length - b.length);
  const slugs =
    state.logic === "or" ? unionSlugSets(ordered) : intersectSlugSets(ordered);

  return { slugs, reasonKeys };
}

export function filterRecordsBySlugSet<T extends ProductListingRecord>(
  records: T[],
  slugs: Set<string> | null,
): T[] {
  if (!slugs) return records;
  return records.filter((record) => slugs.has(record.slug));
}
