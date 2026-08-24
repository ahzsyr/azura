import "server-only";

import { paginateListing } from "@/features/products/listing/filter";
import type { ListingFilterState, ProductListingRecord } from "@/features/products/listing/types";
import {
  aggregateFacets,
  applyCategoryVisibilityToFacets,
} from "@/features/products/listing/aggregate-facets";
import { aggregateListingFacets } from "@/features/products/listing/facets/facet-engine";
import { collectionMapFromList } from "@/features/collections/collection-navigation";
import { orderCollectionsHierarchy } from "@/features/collections/collection-hierarchy";
import { collectionsDataService } from "@/features/collections/collections-data.service";
import type { Collection } from "@/features/collections/types";
import {
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
import { PRODUCT_INDEX_VERSION } from "@/features/products/index/product-index-types";
import { sortListingRecords, type CollectionSortKey } from "./sort-listing";
import {
  applyProductOrdering,
  resolveProductOrderingProfile,
  type ProductOrderingContext,
  type ProductOrderingSettings,
} from "@/features/products/ordering";
import { loadProductOrderingSettings } from "@/features/products/ordering/load-product-ordering";
import { normalizeListingFilterState } from "./normalize";
import { createListingQueryPlan } from "./query-plan";
import { executeListingQueryPlan } from "./query-engine";
import { createListingIndexFromRecords } from "./indexes/listing-index";
import {
  buildListingSearchIndex,
  rankListingSearchResults,
  searchListingCandidates,
  searchSlugHitsFromCandidates,
} from "./search/listing-search-engine";
import {
  buildListingQueryCacheKey,
  getCachedListingQuery,
  isListingQueryCacheEnabled,
  setCachedListingQuery,
  shouldCacheListingQuery,
} from "./cache/query-cache";

export type { CollectionSortKey };
export { sortListingRecords };

export type ListingQueryMeta = {
  strategy: string;
  totalRecords: number;
  candidateRecords: number;
  matchedRecords: number;
  indexLookups: number;
  filterTimeMs: number;
  facetTimeMs: number;
  searchTimeMs: number;
  totalTimeMs: number;
  engine: string;
};

function resolveQueryEngineMode(): "legacy" | "hybrid" | "inverted" {
  const raw = (process.env.CATALOG_QUERY_ENGINE ?? "").trim().toLowerCase();
  if (raw === "legacy" || raw === "hybrid" || raw === "inverted") return raw;
  // Back-compat: explicit inverted facet flag.
  if (process.env.CATALOG_FACET_ENGINE === "inverted") return "inverted";
  // Shadow compares new engine while returning legacy results.
  if (process.env.CATALOG_FACET_ENGINE_SHADOW === "true") return "hybrid";
  // Default: indexed candidate narrowing + oracle verification.
  return "inverted";
}

function resolveSearchEngineMode(): "legacy" | "indexed" {
  const raw = (process.env.CATALOG_SEARCH_ENGINE ?? "").trim().toLowerCase();
  if (raw === "indexed") return "indexed";
  if (raw === "legacy") return "legacy";
  return "legacy";
}

function diagnosticsEnabled(): boolean {
  return (
    process.env.CATALOG_QUERY_DIAGNOSTICS === "1" ||
    process.env.CATALOG_QUERY_DIAGNOSTICS === "true" ||
    process.env.NODE_ENV !== "production"
  );
}

/** Full taxonomy including hidden — required for Category.visible facet suppression. */
async function loadAllCollections(localePrefix: string): Promise<Collection[]> {
  const allCols = await collectionsDataService.loadAll({ localePrefix });
  return orderCollectionsHierarchy(allCols);
}

function visibleCollections(all: Collection[]): Collection[] {
  return all.filter((c) => c.visible !== false);
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
  inputState: ListingFilterState,
  options?: {
    prefilteredRecords?: ProductListingRecord[];
    collectionSort?: CollectionSortKey;
    listingMode?: "product" | "collection";
    collections?: Collection[];
    /** Explicit listing surface for Product Ordering profiles. */
    orderingContext?: ProductOrderingContext;
    orderingSettings?: ProductOrderingSettings | null;
  },
): Promise<ProductListingQueryResult & { queryMeta?: ListingQueryMeta }> {
  const started = Date.now();
  const listingMode = options?.listingMode ?? "product";
  const state = normalizeListingFilterState(inputState);
  const engineMode = resolveQueryEngineMode();
  const searchMode = resolveSearchEngineMode();

  if (isListingQueryCacheEnabled() && shouldCacheListingQuery(state) && !options?.prefilteredRecords) {
    const cacheKey = buildListingQueryCacheKey({
      locale: localePrefix,
      listingMode,
      state,
      indexVersion: PRODUCT_INDEX_VERSION,
    });
    const cached = getCachedListingQuery(cacheKey);
    if (cached) {
      return {
        records: cached.records,
        facets: cached.facets,
        total: cached.total ?? cached.records.length,
        page: state.page,
        per: state.per,
        totalPages: cached.totalPages ?? 1,
      };
    }
  }

  const taxonomy =
    options?.collections ?? (await loadAllCollections(localePrefix));
  const collections = visibleCollections(taxonomy);
  const scopeBySlug = collectionMapFromList(collections);
  const base =
    options?.prefilteredRecords ??
    ((await loadListingRecords(localePrefix)) as ProductListingRecord[]);

  const plan = createListingQueryPlan(state);
  let searchSlugHits: Set<string> | undefined;
  let searchTimeMs = 0;

  const searchStarted = Date.now();
  if (state.q.trim()) {
    const exact = state.qExact === true;
    if (searchMode === "indexed" && !exact) {
      const searchIndex = buildListingSearchIndex(base);
      const { candidates } = searchListingCandidates(searchIndex, state.q);
      if (candidates.length > 0) {
        searchSlugHits = searchSlugHitsFromCandidates(base, candidates);
      } else {
        // Fall back to token lookup / substring via oracle.
        const tokenHits = await searchTokenLookup(localePrefix, state.q);
        if (tokenHits && tokenHits.size > 0) searchSlugHits = tokenHits;
      }
    } else if (!exact) {
      const tokenHits = await searchTokenLookup(localePrefix, state.q);
      if (tokenHits && tokenHits.size > 0) {
        searchSlugHits = tokenHits;
      }
    }
  }
  searchTimeMs = Date.now() - searchStarted;

  const activeFilterCount = countActiveFilters({ ...state, collectionScope: null });
  const invertedIndex =
    activeFilterCount > 0 || state.stockOnly || state.collectionScope
      ? await loadInvertedFacetIndex(localePrefix).catch(() => null)
      : null;

  const listingIndex =
    engineMode === "legacy"
      ? null
      : createListingIndexFromRecords(base, {
          inverted: invertedIndex,
          collectionScopeBySlug: scopeBySlug,
        });

  const filterStarted = Date.now();
  let engineResult = executeListingQueryPlan(base, plan, {
    listingIndex,
    searchSlugHits,
    collectionScopeBySlug: scopeBySlug,
    listingMode,
    categoryTaxonomy: taxonomy,
    forceScan: engineMode === "legacy",
  });

  // Shadow compare against legacy scan when hybrid.
  if (engineMode === "hybrid" && listingIndex) {
    const legacyResult = executeListingQueryPlan(base, plan, {
      searchSlugHits,
      collectionScopeBySlug: scopeBySlug,
      listingMode,
      categoryTaxonomy: taxonomy,
      forceScan: true,
    });
    trackInvertedFacetParity({
      locale: localePrefix,
      q: state.q.trim(),
      listingMode,
      legacy: legacyResult.records,
      shadow: engineResult.records,
      reasonKeys: ["query-engine"],
    });
    // Hybrid returns legacy (safe), shadows new engine.
    engineResult = {
      ...legacyResult,
      candidateCount: engineResult.candidateCount,
      indexLookups: engineResult.indexLookups,
      strategy: engineResult.strategy,
    };
  }

  // Legacy inverted slug path parity (existing flag behavior).
  if (
    process.env.CATALOG_FACET_ENGINE_SHADOW === "true" &&
    process.env.CATALOG_FACET_ENGINE !== "inverted" &&
    invertedIndex &&
    activeFilterCount > 0
  ) {
    const invertedMatch = matchListingFacetSlugs(invertedIndex, state);
    const shadowFiltered = executeListingQueryPlan(base, plan, {
      searchSlugHits,
      collectionScopeBySlug: scopeBySlug,
      listingMode,
      categoryTaxonomy: taxonomy,
      forceScan: true,
    });
    const narrowed = filterRecordsBySlugSet(base, invertedMatch.slugs);
    const shadowViaIndex = executeListingQueryPlan(narrowed, plan, {
      searchSlugHits,
      collectionScopeBySlug: scopeBySlug,
      listingMode,
      categoryTaxonomy: taxonomy,
      forceScan: true,
    });
    trackInvertedFacetParity({
      locale: localePrefix,
      q: state.q.trim(),
      listingMode,
      legacy: shadowFiltered.records,
      shadow: shadowViaIndex.records,
      reasonKeys: invertedMatch.reasonKeys,
    });
  }

  const filterTimeMs = Date.now() - filterStarted;

  let filtered = engineResult.records;
  if (state.q.trim() && searchMode === "indexed") {
    filtered = rankListingSearchResults(filtered, state.q, {
      exact: state.qExact === true,
    });
  }

  let sorted = filtered;
  if (options?.orderingContext && options.listingMode !== "collection") {
    const settings =
      options.orderingSettings ?? (await loadProductOrderingSettings(localePrefix));
    const profile = resolveProductOrderingProfile(settings, options.orderingContext);
    if (profile) {
      sorted = applyProductOrdering(filtered, profile);
    } else if (options.collectionSort) {
      sorted = sortListingRecords(filtered, options.collectionSort);
    }
  } else if (options?.collectionSort) {
    sorted = sortListingRecords(filtered, options.collectionSort);
  }

  const pagination = paginateListing(sorted, state.page, state.per);
  const facetScope = state.collectionScope?.trim() || "global";
  const hasActiveFilters = activeFilterCount > 0;

  const facetStarted = Date.now();
  const cachedFacets = hasActiveFilters
    ? null
    : await loadFacetIndex(localePrefix, facetScope);
  const facets = hasActiveFilters
    ? aggregateListingFacets({
        state,
        records: base,
        taxonomy,
        matchedRecords: filtered,
        listingIndex,
      })
    : cachedFacets
      ? applyCategoryVisibilityToFacets(cachedFacets, taxonomy)
      : aggregateFacets(filtered, taxonomy);
  const facetTimeMs = Date.now() - facetStarted;

  searchAnalytics.trackCatalogListingQuery({
    q: state.q.trim(),
    locale: localePrefix,
    resultCount: pagination.total,
    durationMs: Date.now() - started,
    activeFilterCount,
    listingMode,
    collectionScope: state.collectionScope,
  });

  const result: ProductListingQueryResult & { queryMeta?: ListingQueryMeta } = {
    records: pagination.items,
    facets,
    total: pagination.total,
    page: state.page,
    per: state.per,
    totalPages: pagination.totalPages,
  };

  if (diagnosticsEnabled()) {
    result.queryMeta = {
      strategy: engineResult.strategy,
      totalRecords: base.length,
      candidateRecords: engineResult.candidateCount,
      matchedRecords: engineResult.matchedCount,
      indexLookups: engineResult.indexLookups,
      filterTimeMs,
      facetTimeMs,
      searchTimeMs,
      totalTimeMs: Date.now() - started,
      engine: engineMode,
    };
  }

  if (
    isListingQueryCacheEnabled() &&
    shouldCacheListingQuery(state) &&
    !options?.prefilteredRecords
  ) {
    const cacheKey = buildListingQueryCacheKey({
      locale: localePrefix,
      listingMode,
      state,
      indexVersion: PRODUCT_INDEX_VERSION,
    });
    setCachedListingQuery(cacheKey, {
      records: result.records,
      facets: result.facets,
      total: result.total,
      page: result.page,
      per: result.per,
      totalPages: result.totalPages,
    });
  }

  return result;
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
