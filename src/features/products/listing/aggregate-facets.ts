import { collectionDepth } from "@/features/collections/collection-hierarchy";
import { collectionMapFromList } from "@/features/collections/collection-navigation";
import type { Collection } from "@/features/collections/types";
import {
  buildCategoryFacetIndex,
  isCategoryFacetValueVisible,
  isCategoryTaxonomyNodeVisible,
  resolveCategoriesForProductFacet,
  resolveCategoryForFacetValue,
} from "@/features/categories/resolve-category-for-facet";
import type {
  CollectionFacetOption,
  FacetOption,
  ListingFacets,
  ProductListingRecord,
} from "./types";

function countMap(values: string[]): Map<string, number> {
  const m = new Map<string, number>();
  for (const v of values) {
    if (!v) continue;
    m.set(v, (m.get(v) ?? 0) + 1);
  }
  return m;
}

function toFacetOptions(m: Map<string, number>): FacetOption[] {
  return [...m.entries()]
    .map(([value, count]) => ({ value, label: value, count }))
    .sort((a, b) => a.label.localeCompare(b.label));
}

/**
 * Aggregate listing facets.
 * `collections` must be the full taxonomy (including hidden) so Category.visible
 * can suppress Category and Collections facet options.
 *
 * Category facet options are owned by settings Categories (visible nodes only).
 * Orphan product.category free-text does not emit.
 */
export function aggregateFacets(
  records: ProductListingRecord[],
  collections: Collection[],
): ListingFacets {
  const taxonomyIndex = buildCategoryFacetIndex(collections);
  const visibleCollections = collections.filter(isCategoryTaxonomyNodeVisible);
  const bySlug = collectionMapFromList(visibleCollections);

  // Count products per visible Category (settings name as facet value)
  const catCounts = new Map<string, number>();
  for (const r of records) {
    const hits = resolveCategoriesForProductFacet(
      {
        value: r.category,
        categoryIds: r.categoryIds,
        collectionSlugs: r.collectionSlugs,
      },
      taxonomyIndex,
    ).filter(isCategoryTaxonomyNodeVisible);

    const seenNames = new Set<string>();
    for (const node of hits) {
      const label = node.name || node.slug;
      if (!label || seenNames.has(label)) continue;
      seenNames.add(label);
      catCounts.set(label, (catCounts.get(label) ?? 0) + 1);
    }
  }

  const brandCounts = countMap(records.map((r) => r.brand ?? "").filter(Boolean));
  const tagCounts = countMap(records.flatMap((r) => r.tags));
  const condCounts = countMap(records.flatMap((r) => r.conditions));

  const variationMaps: Record<string, Map<string, number>> = {};
  for (const r of records) {
    for (const [type, opts] of Object.entries(r.variationFacets)) {
      if (!variationMaps[type]) variationMaps[type] = new Map();
      for (const o of opts) {
        variationMaps[type].set(o, (variationMaps[type].get(o) ?? 0) + 1);
      }
    }
  }

  const colCounts = new Map<string, number>();
  for (const r of records) {
    for (const slug of r.collectionSlugs) {
      colCounts.set(slug, (colCounts.get(slug) ?? 0) + 1);
    }
  }

  const collectionFacets: CollectionFacetOption[] = visibleCollections
    .filter((c) => (colCounts.get(c.slug) ?? 0) > 0)
    .map((c) => ({
      slug: c.slug,
      value: c.slug,
      label: c.name,
      depth: collectionDepth(c, bySlug),
      count: colCounts.get(c.slug) ?? 0,
    }));

  let priceMin = Infinity;
  let priceMax = 0;
  let currency = records[0]?.price.currency ?? "USD";
  for (const r of records) {
    if (r.priceMin < priceMin) priceMin = r.priceMin;
    if (r.priceMax > priceMax) priceMax = r.priceMax;
    currency = r.price.currency;
  }
  if (!Number.isFinite(priceMin)) priceMin = 0;
  if (priceMax < priceMin) priceMax = priceMin;

  const variations: Record<string, FacetOption[]> = {};
  for (const [type, m] of Object.entries(variationMaps)) {
    variations[type] = toFacetOptions(m);
  }

  return {
    collections: collectionFacets,
    categories: toFacetOptions(catCounts),
    brands: toFacetOptions(brandCounts),
    tags: toFacetOptions(tagCounts),
    conditions: toFacetOptions(condCounts),
    variations,
    priceMin,
    priceMax,
    currency,
  };
}

/** Post-filter cached facet-index against Category.visible; drop orphans; normalize to settings names. */
export function applyCategoryVisibilityToFacets(
  facets: ListingFacets,
  collections: Collection[],
): ListingFacets {
  const taxonomyIndex = buildCategoryFacetIndex(collections);
  const visibleSlugs = new Set(
    collections.filter(isCategoryTaxonomyNodeVisible).map((c) => c.slug),
  );

  const categoryCounts = new Map<string, number>();
  for (const opt of facets.categories) {
    if (!isCategoryFacetValueVisible(opt.value, taxonomyIndex)) continue;
    const node = resolveCategoryForFacetValue(opt.value, taxonomyIndex);
    if (!node) continue;
    const label = node.name || node.slug;
    categoryCounts.set(label, (categoryCounts.get(label) ?? 0) + opt.count);
  }

  return {
    ...facets,
    categories: toFacetOptions(categoryCounts),
    collections: facets.collections.filter((opt) => visibleSlugs.has(opt.slug)),
  };
}
