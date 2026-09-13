import type { Collection } from "@/features/collections/types";
import { aggregateFacets, applyCategoryVisibilityToFacets } from "../aggregate-facets";
import type { ListingFilterState, ListingFacets, ProductListingRecord } from "../types";
import type { ListingIndex } from "../indexes/types";
import {
  differenceCandidateSets,
  intersectionSize,
  type CandidateSet,
} from "../indexes/candidate-set";
import { createListingQueryPlan } from "../query-plan";
import { executeListingQueryPlan } from "../query-engine";
import { candidateFromIndices, candidateSetFromSlugSet } from "../indexes/candidate-set";

export type FacetAggregateStrategy = "self_inclusive" | "self_excluding";

export type FacetQueryContext = {
  state: ListingFilterState;
  records: ProductListingRecord[];
  taxonomy: Collection[];
  /** Matched records after oracle filter (self-inclusive baseline). */
  matchedRecords: ProductListingRecord[];
  listingIndex?: ListingIndex | null;
  strategy?: FacetAggregateStrategy;
};

function envFacetSemantics(): FacetAggregateStrategy {
  return process.env.CATALOG_FACET_SEMANTICS === "self_excluding"
    ? "self_excluding"
    : "self_inclusive";
}

function envFacetEngine(): "legacy" | "indexed" {
  return process.env.CATALOG_FACET_ENGINE === "indexed" ||
    process.env.CATALOG_FACET_ENGINE === "inverted"
    ? "indexed"
    : "legacy";
}

function countMapFromIntersection(
  candidateSet: CandidateSet,
  values: string[],
  getPosting: (value: string) => CandidateSet,
): Map<string, number> {
  const m = new Map<string, number>();
  for (const value of values) {
    const n = intersectionSize(candidateSet, getPosting(value));
    if (n > 0) m.set(value, n);
  }
  return m;
}

function toFacetOptions(m: Map<string, number>): ListingFacets["brands"] {
  return [...m.entries()]
    .map(([value, count]) => ({ value, label: value, count }))
    .sort((a, b) => a.label.localeCompare(b.label));
}

/**
 * Build a candidate set representing "all filters except one dimension"
 * for self-excluding facet counts.
 */
function candidatesExcludingDimension(
  records: ProductListingRecord[],
  state: ListingFilterState,
  listingIndex: ListingIndex,
  exclude:
    | "categories"
    | "brands"
    | "collections"
    | "tags"
    | "conditions"
    | "variations",
): CandidateSet {
  const cleared: ListingFilterState = {
    ...state,
    categories: exclude === "categories" ? [] : state.categories,
    brands: exclude === "brands" ? [] : state.brands,
    collections: exclude === "collections" ? [] : state.collections,
    tags: exclude === "tags" ? [] : state.tags,
    conditions: exclude === "conditions" ? [] : state.conditions,
    variations: exclude === "variations" ? {} : state.variations,
  };
  const plan = createListingQueryPlan(cleared);
  const result = executeListingQueryPlan(records, plan, {
    listingIndex,
    forceScan: false,
  });
  // Map matched slugs back to indices for intersection counts.
  const slugSet = new Set(result.records.map((r) => r.slug));
  return candidateSetFromSlugSet(records, slugSet) ?? candidateFromIndices(0);
}

function aggregateIndexedSelfInclusive(
  matchedRecords: ProductListingRecord[],
  taxonomy: Collection[],
  listingIndex: ListingIndex,
  allRecords: ProductListingRecord[],
): ListingFacets {
  // Prefer scanning matched records for inclusive (matches legacy aggregateFacets exactly,
  // including category taxonomy resolution). Indexed path used for excluding strategy.
  void listingIndex;
  void allRecords;
  return aggregateFacets(matchedRecords, taxonomy);
}

function aggregateIndexedSelfExcluding(
  ctx: FacetQueryContext,
  listingIndex: ListingIndex,
): ListingFacets {
  const { records, state, taxonomy, matchedRecords } = ctx;
  const base = aggregateFacets(matchedRecords, taxonomy);

  const brandCandidates = candidatesExcludingDimension(records, state, listingIndex, "brands");
  const brandValues = listingIndex.listFacetValues("brand");
  const brandCounts = countMapFromIntersection(brandCandidates, brandValues, (v) =>
    listingIndex.getFacet("brand", v),
  );

  const tagCandidates = candidatesExcludingDimension(records, state, listingIndex, "tags");
  const tagValues = listingIndex.listFacetValues("tag");
  const tagCounts = countMapFromIntersection(tagCandidates, tagValues, (v) =>
    listingIndex.getFacet("tag", v),
  );

  const conditionCandidates = candidatesExcludingDimension(
    records,
    state,
    listingIndex,
    "conditions",
  );
  const conditionValues = listingIndex.listFacetValues("condition");
  const conditionCounts = countMapFromIntersection(conditionCandidates, conditionValues, (v) =>
    listingIndex.getFacet("condition", v),
  );

  const collectionCandidates = candidatesExcludingDimension(
    records,
    state,
    listingIndex,
    "collections",
  );
  const collectionValues = listingIndex.listFacetValues("collection");
  const collectionCountMap = countMapFromIntersection(
    collectionCandidates,
    collectionValues,
    (v) => listingIndex.getFacet("collection", v),
  );

  const variations: ListingFacets["variations"] = {};
  const varCandidates = candidatesExcludingDimension(records, state, listingIndex, "variations");
  for (const type of listingIndex.listVariationTypes()) {
    const opts = listingIndex.listVariationOptions(type);
    const m = countMapFromIntersection(varCandidates, opts, (o) =>
      listingIndex.getVariation(type, o),
    );
    variations[type] = toFacetOptions(m);
  }

  return applyCategoryVisibilityToFacets(
    {
      ...base,
      brands: toFacetOptions(brandCounts),
      tags: toFacetOptions(tagCounts),
      conditions: toFacetOptions(conditionCounts),
      collections: base.collections.map((c) => ({
        ...c,
        count: collectionCountMap.get(c.slug) ?? collectionCountMap.get(c.value) ?? c.count,
      })),
      variations: Object.keys(variations).length ? variations : base.variations,
    },
    taxonomy,
  );
}

/**
 * Dedicated facet engine. Default strategy is self_inclusive (current storefront UX).
 * self_excluding is available behind CATALOG_FACET_SEMANTICS=self_excluding.
 */
export function aggregateListingFacets(ctx: FacetQueryContext): ListingFacets {
  const strategy = ctx.strategy ?? envFacetSemantics();
  const engine = envFacetEngine();
  const { matchedRecords, taxonomy, listingIndex, records } = ctx;

  // Explicit strategy on the call wins for tests / callers; env only picks default.
  if (strategy === "self_inclusive") {
    return aggregateFacets(matchedRecords, taxonomy);
  }

  if (strategy === "self_excluding" && listingIndex) {
    return aggregateIndexedSelfExcluding(ctx, listingIndex);
  }

  // Env-driven indexed inclusive path (same counts as legacy scan today).
  if (engine === "indexed" && listingIndex) {
    return aggregateIndexedSelfInclusive(matchedRecords, taxonomy, listingIndex, records);
  }

  return aggregateFacets(matchedRecords, taxonomy);
}

export function resolveFacetStrategy(): FacetAggregateStrategy {
  return envFacetSemantics();
}

/** Exported for tests — measure how excluding differs from inclusive. */
export function facetCandidateDifferenceSize(
  inclusive: CandidateSet,
  excluding: CandidateSet,
): number {
  return differenceCandidateSets(excluding, inclusive).length;
}
