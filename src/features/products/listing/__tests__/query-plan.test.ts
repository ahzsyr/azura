import assert from "node:assert/strict";
import test from "node:test";

import { createListingQueryPlan } from "../query-plan";
import type { ListingFilterState } from "../types";

const base: ListingFilterState = {
  q: "",
  categories: [],
  brands: [],
  collections: [],
  collectionScope: null,
  tags: [],
  conditions: [],
  variations: {},
  priceMin: null,
  priceMax: null,
  stockOnly: false,
  page: 1,
  per: 20,
};

test("createListingQueryPlan chooses search strategy for q-only", () => {
  const plan = createListingQueryPlan({ ...base, q: "iphone" });
  assert.equal(plan.candidateStrategy, "search");
  assert.equal(plan.capabilities.canUseSearchIndex, true);
  assert.deepEqual(plan.query.tokens, ["iphone"]);
});

test("createListingQueryPlan chooses inverted for facets", () => {
  const plan = createListingQueryPlan({ ...base, brands: ["Apple"] });
  assert.equal(plan.candidateStrategy, "inverted");
  assert.equal(plan.capabilities.canUseInvertedIndex, true);
});

test("createListingQueryPlan chooses hybrid for search + facets", () => {
  const plan = createListingQueryPlan({ ...base, q: "phone", brands: ["Apple"] });
  assert.equal(plan.candidateStrategy, "hybrid");
});

test("createListingQueryPlan scan when unfiltered", () => {
  const plan = createListingQueryPlan(base);
  assert.equal(plan.candidateStrategy, "scan");
});
