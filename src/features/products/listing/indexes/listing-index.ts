import type { InvertedFacetIndexFile } from "@/features/products/index/product-index-types";
import type { ProductListingRecord } from "@/features/products/listing/types";
import type { ListingFilterQueryPlan } from "../query-plan";
import {
  candidateFromSorted,
  emptyCandidateSet,
  intersectCandidateSets,
  unionCandidateSets,
  type CandidateSet,
} from "./candidate-set";
import type { ListingIndex, ListingIndexFacetMatch } from "./types";

function norm(value: string): string {
  return value.trim().toLowerCase();
}

function facetKey(kind: string, value: string): string {
  return `${kind}:${norm(value)}`;
}

function variationKey(type: string, option: string): string {
  return `variation:${norm(type)}:${norm(option)}`;
}

/** Coarse price buckets for candidate narrowing only. */
export const PRICE_BUCKET_EDGES = [0, 25, 50, 100, 250, 500, 1000, 2500, 5000, Infinity] as const;

function priceBucketIndex(price: number): number {
  for (let i = 0; i < PRICE_BUCKET_EDGES.length - 1; i++) {
    if (price < PRICE_BUCKET_EDGES[i + 1]) return i;
  }
  return PRICE_BUCKET_EDGES.length - 2;
}

type RuntimePostings = {
  facets: Map<string, CandidateSet>;
  scope: Map<string, CandidateSet>;
  priceBuckets: CandidateSet[];
  inStock: CandidateSet;
  recordCount: number;
};

function slugsToIds(
  slugs: string[],
  slugToId: Map<string, number>,
): CandidateSet {
  const ids: number[] = [];
  for (const slug of slugs) {
    const id = slugToId.get(slug);
    if (id != null) ids.push(id);
  }
  return candidateFromSorted(ids);
}

function buildRuntimePostings(
  records: ProductListingRecord[],
  inverted: InvertedFacetIndexFile | null,
  collectionScopeBySlug?: Map<string, { slug: string; parentSlug?: string | null }>,
): RuntimePostings {
  const slugToId = new Map<string, number>();
  for (let i = 0; i < records.length; i++) {
    slugToId.set(records[i].slug, i);
  }

  const facets = new Map<string, CandidateSet>();
  if (inverted) {
    for (const [key, slugs] of Object.entries(inverted.facets)) {
      facets.set(key, slugsToIds(slugs, slugToId));
    }
  } else {
    // Build from records when no on-disk index is available.
    const map = new Map<string, Set<number>>();
    const add = (key: string, id: number) => {
      const bucket = map.get(key) ?? new Set<number>();
      bucket.add(id);
      map.set(key, bucket);
    };
    for (let i = 0; i < records.length; i++) {
      const r = records[i];
      if (r.brand) add(facetKey("brand", r.brand), i);
      if (r.category) add(facetKey("category", r.category), i);
      for (const c of r.categories ?? []) add(facetKey("category", c), i);
      for (const t of r.tags ?? []) add(facetKey("tag", t), i);
      for (const c of r.conditions ?? []) add(facetKey("condition", c), i);
      for (const c of r.collectionSlugs ?? []) add(facetKey("collection", c), i);
      for (const [type, options] of Object.entries(r.variationFacets ?? {})) {
        for (const option of options) add(variationKey(type, option), i);
      }
      if (r.in_stock) add("stock:in_stock", i);
    }
    for (const [key, ids] of map) {
      facets.set(key, candidateFromSorted(ids));
    }
  }

  const inStock = facets.get("stock:in_stock")?.slice() ?? emptyCandidateSet();

  const priceBuckets: CandidateSet[] = PRICE_BUCKET_EDGES.slice(0, -1).map(() => []);
  const bucketSets = PRICE_BUCKET_EDGES.slice(0, -1).map(() => new Set<number>());
  for (let i = 0; i < records.length; i++) {
    const r = records[i];
    // A record overlapping a bucket range contributes to that bucket.
    const minB = priceBucketIndex(r.priceMin);
    const maxB = priceBucketIndex(r.priceMax);
    for (let b = minB; b <= maxB; b++) bucketSets[b].add(i);
  }
  for (let b = 0; b < bucketSets.length; b++) {
    priceBuckets[b] = candidateFromSorted(bucketSets[b]);
  }

  const scope = new Map<string, CandidateSet>();
  if (collectionScopeBySlug && collectionScopeBySlug.size > 0) {
    const children = new Map<string, string[]>();
    for (const col of collectionScopeBySlug.values()) {
      const parent = col.parentSlug?.trim() || null;
      if (!parent) continue;
      const list = children.get(parent) ?? [];
      list.push(col.slug);
      children.set(parent, list);
    }

    const descendantsOf = (slug: string): Set<string> => {
      const out = new Set<string>([slug]);
      const stack = [slug];
      while (stack.length) {
        const cur = stack.pop()!;
        for (const child of children.get(cur) ?? []) {
          if (out.has(child)) continue;
          out.add(child);
          stack.push(child);
        }
      }
      return out;
    };

    for (const slug of collectionScopeBySlug.keys()) {
      const desc = descendantsOf(slug);
      const ids: number[] = [];
      for (let i = 0; i < records.length; i++) {
        const r = records[i];
        if (r.collectionSlugs.some((s) => desc.has(s))) ids.push(i);
      }
      if (ids.length) scope.set(slug, candidateFromSorted(ids));
    }
  }

  return {
    facets,
    scope,
    priceBuckets,
    inStock,
    recordCount: records.length,
  };
}

function unionKeys(postings: RuntimePostings, keys: string[]): CandidateSet {
  const sets = keys.map((k) => postings.facets.get(k) ?? emptyCandidateSet());
  return unionCandidateSets(...sets);
}

export function createListingIndexFromRecords(
  records: ProductListingRecord[],
  options?: {
    inverted?: InvertedFacetIndexFile | null;
    collectionScopeBySlug?: Map<string, { slug: string; parentSlug?: string | null }>;
  },
): ListingIndex {
  const postings = buildRuntimePostings(
    records,
    options?.inverted ?? null,
    options?.collectionScopeBySlug,
  );

  const getFacet = (
    dimension: "category" | "brand" | "collection" | "tag" | "condition",
    value: string,
  ): CandidateSet => postings.facets.get(facetKey(dimension, value))?.slice() ?? emptyCandidateSet();

  const getVariation = (type: string, option: string): CandidateSet =>
    postings.facets.get(variationKey(type, option))?.slice() ?? emptyCandidateSet();

  const estimateFacetSize = (dimension: string, value: string): number => {
    if (dimension.startsWith("variation:")) {
      const type = dimension.slice("variation:".length);
      return postings.facets.get(variationKey(type, value))?.length ?? 0;
    }
    return postings.facets.get(facetKey(dimension, value))?.length ?? 0;
  };

  const matchFacets = (plan: ListingFilterQueryPlan): ListingIndexFacetMatch => {
    const reasonKeys: string[] = [];
    let lookups = 0;

    type Dim = { reason: string; set: CandidateSet; size: number };
    const dimensions: Dim[] = [];

    const pushUnion = (reason: string, keys: string[]) => {
      if (!keys.length) return;
      lookups += keys.length;
      const set = unionKeys(postings, keys);
      reasonKeys.push(reason);
      dimensions.push({ reason, set, size: set.length });
    };

    pushUnion(
      "category",
      plan.facets.categories.map((v) => facetKey("category", v)),
    );
    pushUnion(
      "brand",
      plan.facets.brands.map((v) => facetKey("brand", v)),
    );
    pushUnion(
      "collection",
      plan.facets.collections.map((v) => facetKey("collection", v)),
    );
    pushUnion(
      "tag",
      plan.facets.tags.map((v) => facetKey("tag", v)),
    );
    pushUnion(
      "condition",
      plan.facets.conditions.map((v) => facetKey("condition", v)),
    );

    // Variations: within type = OR, across types = AND (always), even in OR facet mode
    // matching the oracle's matchesVariations / OR variation handling.
    const varEntries = Object.entries(plan.facets.variations).filter(
      ([, opts]) => opts.length > 0,
    );
    if (varEntries.length > 0) {
      if (plan.logic === "or") {
        // OR mode: any variation type match counts as one facet dimension (union across types).
        const typeSets: CandidateSet[] = [];
        for (const [type, opts] of varEntries) {
          lookups += opts.length;
          typeSets.push(unionKeys(postings, opts.map((o) => variationKey(type, o))));
        }
        const set = unionCandidateSets(...typeSets);
        reasonKeys.push("variation");
        dimensions.push({ reason: "variation", set, size: set.length });
      } else {
        // AND across types: intersect type unions; treat as one combined dimension for AND algebra.
        let combined: CandidateSet | null = null;
        for (const [type, opts] of varEntries) {
          lookups += opts.length;
          const typeSet = unionKeys(postings, opts.map((o) => variationKey(type, o)));
          combined = combined == null ? typeSet : intersectCandidateSets(combined, typeSet);
        }
        reasonKeys.push("variation");
        dimensions.push({
          reason: "variation",
          set: combined ?? emptyCandidateSet(),
          size: combined?.length ?? 0,
        });
      }
    }

    if (dimensions.length === 0) {
      return { candidates: null, lookups, reasonKeys };
    }

    // Selectivity-aware ordering for AND.
    dimensions.sort((a, b) => a.size - b.size);

    let result: CandidateSet;
    if (plan.logic === "or") {
      result = unionCandidateSets(...dimensions.map((d) => d.set));
    } else {
      result = intersectCandidateSets(...dimensions.map((d) => d.set));
    }

    return { candidates: result, lookups, reasonKeys };
  };

  const listFacetValues = (
    dimension: "category" | "brand" | "collection" | "tag" | "condition",
  ): string[] => {
    const prefix = `${dimension}:`;
    const out: string[] = [];
    for (const key of postings.facets.keys()) {
      if (key.startsWith(prefix)) out.push(key.slice(prefix.length));
    }
    return out.sort((a, b) => a.localeCompare(b));
  };

  const listVariationTypes = (): string[] => {
    const types = new Set<string>();
    for (const key of postings.facets.keys()) {
      if (!key.startsWith("variation:")) continue;
      const rest = key.slice("variation:".length);
      const idx = rest.indexOf(":");
      if (idx > 0) types.add(rest.slice(0, idx));
    }
    return [...types].sort((a, b) => a.localeCompare(b));
  };

  const listVariationOptions = (type: string): string[] => {
    const prefix = `variation:${norm(type)}:`;
    const out: string[] = [];
    for (const key of postings.facets.keys()) {
      if (key.startsWith(prefix)) out.push(key.slice(prefix.length));
    }
    return out.sort((a, b) => a.localeCompare(b));
  };

  const getPriceRange = (min: number | null, max: number | null): CandidateSet | null => {
    if (min == null && max == null) return null;
    const lo = min ?? 0;
    const hi = max ?? Infinity;
    const sets: CandidateSet[] = [];
    for (let b = 0; b < postings.priceBuckets.length; b++) {
      const edgeLo = PRICE_BUCKET_EDGES[b];
      const edgeHi = PRICE_BUCKET_EDGES[b + 1];
      // Bucket overlaps [lo, hi] if edgeLo <= hi && edgeHi > lo
      if (edgeLo <= hi && edgeHi > lo) {
        sets.push(postings.priceBuckets[b]);
      }
    }
    return sets.length ? unionCandidateSets(...sets) : emptyCandidateSet();
  };

  return {
    getFacet,
    getVariation,
    getCollectionScope: (slug: string) => postings.scope.get(slug)?.slice() ?? null,
    getInStock: () => (postings.inStock.length ? postings.inStock.slice() : null),
    getPriceRange,
    estimateFacetSize,
    matchFacets,
    listFacetValues,
    listVariationTypes,
    listVariationOptions,
  };
}
