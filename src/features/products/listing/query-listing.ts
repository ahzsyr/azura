import "server-only";

import { filterListingCatalog, paginateListing } from "@/features/products/listing/filter";
import type { ListingFilterState, ProductListingRecord } from "@/features/products/listing/types";
import { aggregateFacets } from "@/features/products/listing/aggregate-facets";
import { collectionMapFromList } from "@/features/collections/collection-navigation";
import { orderCollectionsHierarchy } from "@/features/collections/collection-hierarchy";
import { collectionsDataService } from "@/features/collections/collections-data.service";
import type { Collection } from "@/features/collections/types";
import {
  loadCollectionSlugIndex,
  loadFacetIndex,
  loadInvertedFacetIndex,
  loadListingRecords,
  searchTokenLookup,
} from "@/features/products/index/product-index-loader";
import { countActiveFilters } from "@/features/products/listing/url-state";
import { searchAnalytics } from "@/capabilities/search/engine/analytics/search-analytics";
import {
  filterRecordsBySlugSet,
  matchListingFacetSlugs,
} from "@/features/products/index/inverted-facet-index";
import type { ProductListingQueryResult } from "@/features/products/index/product-index-types";
import type { IndexedProductListingRecord } from "@/features/products/index/product-index-types";
import { sortListingRecords, type CollectionSortKey } from "./sort-listing";

export type { CollectionSortKey };
export { sortListingRecords };

const INVERTED_ENGINE_PRIMARY = process.env.CATALOG_FACET_ENGINE === "inverted";
const INVERTED_ENGINE_SHADOW =
  process.env.CATALOG_FACET_ENGINE_SHADOW === "true" || INVERTED_ENGINE_PRIMARY;

async function loadCollections(localePrefix: string): Promise<Collection[]> {
  const allCols = await collectionsDataService.loadAll({ localePrefix });
  return orderCollectionsHierarchy(allCols.filter((c) => c.visible !== false));
}

function topNOverlap(a: ProductListingRecord[], b: ProductListingRecord[], n = 50): number {
  const left = a.slice(0, n).map((record) => record.slug);
  const right = new Set(b.slice(0, n).map((record) => record.slug));
  if (left.length === 0 && right.size === 0) return 1;
  if (left.length === 0 || right.size === 0) return 0;
  const shared = left.filter((slug) => right.has(slug)).length;
  return Number((shared / Math.max(left.length, right.size)).toFixed(4));
}

function trackInvertedFacetParity(params: {
  locale: string;
  q: string;
  listingMode: "product" | "collection";
  legacy: ProductListingRecord[];
  shadow: ProductListingRecord[];
  reasonKeys: string[];
}): void {
  const legacySlugs = new Set(params.legacy.map((record) => record.slug));
  const shadowSlugs = new Set(params.shadow.map((record) => record.slug));
  const missingFromShadow = [...legacySlugs].filter((slug) => !shadowSlugs.has(slug)).length;
  const extraInShadow = [...shadowSlugs].filter((slug) => !legacySlugs.has(slug)).length;
  const facetDivergence =
    params.legacy.length === 0 && params.shadow.length === 0
      ? 0
      : Number(
          ((missingFromShadow + extraInShadow) / Math.max(params.legacy.length, params.shadow.length)).toFixed(4),
        );

  if (
    params.legacy.length === params.shadow.length &&
    facetDivergence === 0 &&
    topNOverlap(params.legacy, params.shadow) === 1
  ) {
    return;
  }

  searchAnalytics.trackCatalogListingParity({
    locale: params.locale,
    q: params.q,
    listingMode: params.listingMode,
    oldResultCount: params.legacy.length,
    newResultCount: params.shadow.length,
    topNOverlap: topNOverlap(params.legacy, params.shadow),
    facetDivergence,
    exclusionReasons: params.reasonKeys,
  });
}

export async function queryProductListing(
  localePrefix: string,
  state: ListingFilterState,
  options?: {
    prefilteredRecords?: ProductListingRecord[];
    collectionSort?: CollectionSortKey;
    listingMode?: "product" | "collection";
    collections?: Collection[];
  },
): Promise<ProductListingQueryResult> {
  const started = Date.now();
  const listingMode = options?.listingMode ?? "product";
  const collections =
    options?.collections ?? (await loadCollections(localePrefix));
  const scopeBySlug = collectionMapFromList(collections);
  const base =
    options?.prefilteredRecords ??
    ((await loadListingRecords(localePrefix)) as ProductListingRecord[]);

  let candidates = base;
  let searchSlugHits: Set<string> | undefined;

  if (state.q.trim()) {
    const tokenHits = await searchTokenLookup(localePrefix, state.q);
    if (tokenHits && tokenHits.size > 0) {
      searchSlugHits = tokenHits;
      candidates = candidates.filter((r) => tokenHits.has(r.slug));
    }
  }

  const activeFilterCount = countActiveFilters({ ...state, collectionScope: null });
  const invertedIndex =
    activeFilterCount > 0 && INVERTED_ENGINE_SHADOW
      ? await loadInvertedFacetIndex(localePrefix)
      : null;
  const invertedMatch = invertedIndex ? matchListingFacetSlugs(invertedIndex, state) : null;
  const engineCandidates =
    INVERTED_ENGINE_PRIMARY && invertedMatch
      ? filterRecordsBySlugSet(candidates, invertedMatch.slugs)
      : candidates;

  const filtered = filterListingCatalog(
    engineCandidates,
    state,
    searchSlugHits,
    {
      collectionScopeBySlug: scopeBySlug,
      listingMode,
    },
  );

  if (invertedMatch && !INVERTED_ENGINE_PRIMARY) {
    const shadowFiltered = filterListingCatalog(
      filterRecordsBySlugSet(candidates, invertedMatch.slugs),
      state,
      searchSlugHits,
      {
        collectionScopeBySlug: scopeBySlug,
        listingMode,
      },
    );
    trackInvertedFacetParity({
      locale: localePrefix,
      q: state.q.trim(),
      listingMode,
      legacy: filtered,
      shadow: shadowFiltered,
      reasonKeys: invertedMatch.reasonKeys,
    });
  }

  const sorted = options?.collectionSort
    ? sortListingRecords(filtered, options.collectionSort)
    : filtered;

  const pagination = paginateListing(sorted, state.page, state.per);
  const facetScope = state.collectionScope?.trim() || "global";
  const hasActiveFilters = activeFilterCount > 0;
  const facets = hasActiveFilters
    ? aggregateFacets(filtered, collections)
    : (await loadFacetIndex(localePrefix, facetScope)) ??
      aggregateFacets(filtered, collections);

  searchAnalytics.trackCatalogListingQuery({
    q: state.q.trim(),
    locale: localePrefix,
    resultCount: pagination.total,
    durationMs: Date.now() - started,
    activeFilterCount,
    listingMode,
    collectionScope: state.collectionScope,
  });

  return {
    records: pagination.items,
    facets,
    total: pagination.total,
    page: state.page,
    per: state.per,
    totalPages: pagination.totalPages,
  };
}

export async function queryRelatedListingRecords(
  localePrefix: string,
  options: {
    excludeSlug: string;
    collectionSlugs: string[];
    brand?: string;
    limit?: number;
  },
): Promise<ProductListingRecord[]> {
  const records = await loadListingRecords(localePrefix);
  const colSet = new Set(options.collectionSlugs);
  const limit = options.limit ?? 8;

  const related = records.filter((r) => {
    if (r.slug === options.excludeSlug) return false;
    if (colSet.size === 0) return r.brand === options.brand;
    return r.collectionSlugs.some((s) => colSet.has(s));
  });

  return related.slice(0, limit);
}

export async function queryListingRecordsBySlugs(
  localePrefix: string,
  slugs: string[],
): Promise<ProductListingRecord[]> {
  const records = await loadListingRecords(localePrefix);
  const bySlug = new Map(records.map((r) => [r.slug.toLowerCase(), r]));
  const out: ProductListingRecord[] = [];
  for (const slug of slugs) {
    const hit = bySlug.get(slug.toLowerCase());
    if (hit) out.push(hit);
  }
  return out;
}

export async function queryListingRecordsByIdentifiers(
  localePrefix: string,
  items: Array<{ slug?: string; mpn?: string; name?: string }>,
): Promise<ProductListingRecord[]> {
  const records = await loadListingRecords(localePrefix);
  const norm = (v?: string) => (v ?? "").trim().toLowerCase();

  return items
    .map((item) => {
      const itemSlug = norm(item.slug);
      if (itemSlug) {
        const bySlug = records.find((c) => norm(c.slug) === itemSlug);
        if (bySlug) return bySlug;
      }
      if (item.mpn) {
        const byMpn = records.find((c) => norm(c.mpn) === norm(item.mpn));
        if (byMpn) return byMpn;
      }
      return records.find((c) => norm(c.name) === norm(item.name));
    })
    .filter((c): c is IndexedProductListingRecord => Boolean(c));
}
