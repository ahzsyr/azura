import type { ListingFilterQueryPlan } from "../query-plan";
import type { CandidateSet } from "./candidate-set";

export type FacetDimension =
  | "category"
  | "brand"
  | "collection"
  | "tag"
  | "condition"
  | "variation"
  | "stock";

export type ListingIndexFacetMatch = {
  /** null means "no facet constraint / universe". */
  candidates: CandidateSet | null;
  lookups: number;
  reasonKeys: string[];
};

/**
 * Runtime listing index used by the query engine for candidate narrowing.
 * Built from on-disk inverted facet files + optional scope/price postings.
 */
export interface ListingIndex {
  getFacet(dimension: Exclude<FacetDimension, "variation" | "stock">, value: string): CandidateSet;
  getVariation(type: string, option: string): CandidateSet;
  getCollectionScope(slug: string): CandidateSet | null;
  getInStock(): CandidateSet | null;
  getPriceRange(min: number | null, max: number | null): CandidateSet | null;
  estimateFacetSize(dimension: string, value: string): number;
  matchFacets(plan: ListingFilterQueryPlan): ListingIndexFacetMatch;
  /** All known facet option values for a dimension (for indexed facet counts). */
  listFacetValues(dimension: Exclude<FacetDimension, "variation" | "stock">): string[];
  listVariationTypes(): string[];
  listVariationOptions(type: string): string[];
}
