import type { FilterListingOptions } from "./filter";
import { filterListingCatalog } from "./filter";
import type { ListingFilterQueryPlan } from "./query-plan";
import type { ProductListingRecord } from "./types";
import {
  candidateFromIndices,
  candidateSetFromSlugSet,
  intersectCandidateSets,
  recordsFromCandidateSet,
  type CandidateSet,
} from "./indexes/candidate-set";
import type { ListingIndex } from "./indexes/types";

export type ListingQueryEngineOptions = FilterListingOptions & {
  /** Optional inverted/runtime listing index for candidate narrowing. */
  listingIndex?: ListingIndex | null;
  /** Slug hits from search token lookup / fuzzy. */
  searchSlugHits?: Set<string>;
  /** Force scan path (ignore index). */
  forceScan?: boolean;
};

export type ListingQueryEngineResult = {
  records: ProductListingRecord[];
  candidateCount: number;
  matchedCount: number;
  strategy: ListingFilterQueryPlan["candidateStrategy"];
  indexLookups: number;
  plan: ListingFilterQueryPlan;
};

function resolveCandidatesFromIndex(
  plan: ListingFilterQueryPlan,
  recordCount: number,
  listingIndex: ListingIndex | null | undefined,
  searchSlugHits: Set<string> | undefined,
  records: ProductListingRecord[],
): { candidates: CandidateSet; indexLookups: number; usedIndex: boolean } {
  if (!listingIndex || plan.candidateStrategy === "scan") {
    const searchOnly = searchSlugHits
      ? candidateSetFromSlugSet(records, searchSlugHits)
      : candidateFromIndices(recordCount);
    return {
      candidates: searchOnly ?? candidateFromIndices(recordCount),
      indexLookups: 0,
      usedIndex: false,
    };
  }

  let indexLookups = 0;
  const facetSet = listingIndex.matchFacets(plan);
  indexLookups += facetSet.lookups;

  let candidates: CandidateSet | null = facetSet.candidates;

  if (plan.capabilities.canUseScopeIndex && plan.scope.collection) {
    const scopeSet = listingIndex.getCollectionScope(plan.scope.collection);
    indexLookups += 1;
    if (scopeSet) {
      candidates =
        candidates == null
          ? scopeSet
          : intersectCandidateSets(candidates, scopeSet);
    }
  }

  if (plan.stockOnly) {
    const stock = listingIndex.getInStock();
    indexLookups += 1;
    if (stock) {
      candidates =
        candidates == null ? stock : intersectCandidateSets(candidates, stock);
    }
  }

  if (plan.capabilities.canUseRangeIndex) {
    const priceSet = listingIndex.getPriceRange(plan.range.priceMin, plan.range.priceMax);
    indexLookups += 1;
    if (priceSet) {
      candidates =
        candidates == null ? priceSet : intersectCandidateSets(candidates, priceSet);
    }
  }

  if (searchSlugHits) {
    const searchSet = candidateSetFromSlugSet(records, searchSlugHits);
    if (searchSet) {
      candidates =
        candidates == null
          ? searchSet
          : intersectCandidateSets(candidates, searchSet);
    }
  }

  if (candidates == null) {
    return {
      candidates: candidateFromIndices(recordCount),
      indexLookups,
      usedIndex: false,
    };
  }

  return { candidates, indexLookups, usedIndex: true };
}

/**
 * Execute a listing query plan.
 * Indexes only narrow candidates; `filterListingCatalog` remains the correctness oracle.
 */
export function executeListingQueryPlan(
  records: ProductListingRecord[],
  plan: ListingFilterQueryPlan,
  options?: ListingQueryEngineOptions,
): ListingQueryEngineResult {
  const forceScan = options?.forceScan === true;
  const listingIndex = forceScan ? null : options?.listingIndex;

  const { candidates, indexLookups, usedIndex } = resolveCandidatesFromIndex(
    plan,
    records.length,
    listingIndex,
    options?.searchSlugHits,
    records,
  );

  const narrowed = usedIndex || options?.searchSlugHits
    ? recordsFromCandidateSet(records, candidates)
    : records;

  const filtered = filterListingCatalog(
    narrowed,
    plan.state,
    options?.searchSlugHits,
    {
      collectionScopeBySlug: options?.collectionScopeBySlug,
      listingMode: options?.listingMode,
      categoryTaxonomy: options?.categoryTaxonomy,
    },
  );

  return {
    records: filtered,
    candidateCount: narrowed.length,
    matchedCount: filtered.length,
    strategy: usedIndex
      ? plan.candidateStrategy === "search"
        ? "hybrid"
        : plan.candidateStrategy === "scan"
          ? "inverted"
          : plan.candidateStrategy
      : options?.searchSlugHits
        ? "search"
        : "scan",
    indexLookups,
    plan,
  };
}
