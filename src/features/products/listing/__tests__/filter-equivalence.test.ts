/**
 * Call graph freeze (Phase 1 inventory)
 * -------------------------------------
 * URL searchParams
 *   → filterStateFromSearchParams (url-state.ts)
 *   → normalizeListingFilterState (normalize.ts)
 *   → createListingQueryPlan (query-plan.ts)
 *   → queryProductListing (query-listing.ts)
 *        → loadListingRecords / searchTokenLookup / loadInvertedFacetIndex
 *        → createListingIndexFromRecords (indexes/listing-index.ts)
 *        → executeListingQueryPlan (query-engine.ts)
 *             → ListingIndex.matchFacets / scope / stock / price
 *             → filterListingCatalog (filter.ts)  ← correctness oracle
 *        → aggregateListingFacets (facets/facet-engine.ts) | aggregateFacets
 *        → sortListingRecords → paginateListing
 *   → /api/catalog/listing JSON
 *   → useCatalogListingFetch → ProductListingIsland
 */

import assert from "node:assert/strict";
import test from "node:test";

import { filterListingCatalog } from "../filter";
import { normalizeListingFilterState } from "../normalize";
import { createListingQueryPlan } from "../query-plan";
import { executeListingQueryPlan } from "../query-engine";
import { createListingIndexFromRecords } from "../indexes/listing-index";
import type { ListingFilterState, ProductListingRecord } from "../types";

function record(slug: string, overrides: Partial<ProductListingRecord> = {}): ProductListingRecord {
  return {
    slug,
    id: slug,
    name: slug,
    brand: "Cisco",
    category: "Networking",
    categories: ["Networking"],
    tags: [],
    price: { value: 100, currency: "USD" },
    priceMin: 100,
    priceMax: 100,
    in_stock: true,
    conditions: [],
    variationFacets: {},
    collectionSlugs: ["networking"],
    searchText: slug.toLowerCase(),
    ...overrides,
  };
}

const baseState: ListingFilterState = {
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

const fixtures: ProductListingRecord[] = [
  record("switch-1", { brand: "Cisco", tags: ["sale", "Summer"], collectionSlugs: ["networking"], priceMin: 80, priceMax: 120 }),
  record("switch-2", { brand: "Cisco", tags: ["new"], collectionSlugs: ["networking"], priceMin: 200, priceMax: 250 }),
  record("router-1", { brand: "Juniper", tags: ["sale"], collectionSlugs: ["routing"], priceMin: 500, priceMax: 600, variationFacets: { Storage: ["256GB", "512GB"] } }),
  record("ap-1", { brand: "Ubiquiti", tags: ["wifi"], collectionSlugs: ["wireless"], in_stock: false, priceMin: 40, priceMax: 60 }),
  record("fw-1", { brand: "Fortinet", category: "Security", categories: ["Security"], tags: ["firewall"], collectionSlugs: ["security"], conditions: ["new"], priceMin: 1000, priceMax: 1200 }),
];

function slugsOf(records: ProductListingRecord[]): string[] {
  return records.map((r) => r.slug).sort();
}

test("normalizeListingFilterState trims, dedupes, lowercases tags only", () => {
  const normalized = normalizeListingFilterState({
    ...baseState,
    brands: [" Nike ", "nike", "Adidas", "Nike"],
    tags: ["summer", " Summer ", "SUMMER"],
    categories: [" Shoes ", "Shoes"],
    q: "  hello  ",
    page: 0,
    per: 99 as ListingFilterState["per"],
  });
  assert.equal(normalized.q, "hello");
  assert.deepEqual(normalized.brands, ["Adidas", "nike", "Nike"].sort((a, b) => a.localeCompare(b)));
  assert.deepEqual(normalized.tags, ["summer"]);
  assert.deepEqual(normalized.categories, ["Shoes"]);
  assert.equal(normalized.page, 1);
  assert.equal(normalized.per, 20);
  // Brands remain case-sensitive distinct values (oracle uses exact match).
  assert.equal(normalized.brands.includes("Nike"), true);
  assert.equal(normalized.brands.includes("nike"), true);
});

test("executeListingQueryPlan matches filterListingCatalog oracle (scan)", () => {
  const states: ListingFilterState[] = [
    { ...baseState, brands: ["Cisco"] },
    { ...baseState, tags: ["sale"] },
    { ...baseState, brands: ["Cisco"], tags: ["sale"] },
    { ...baseState, priceMin: 150, priceMax: 300 },
    { ...baseState, stockOnly: true },
    { ...baseState, q: "router" },
    { ...baseState, brands: ["Cisco"], logic: "or", tags: ["wifi"] },
    { ...baseState, variations: { Storage: ["256GB"] } },
    { ...baseState, collections: ["routing"] },
    { ...baseState, conditions: ["new"] },
  ];

  for (const state of states) {
    const plan = createListingQueryPlan(state);
    const expected = filterListingCatalog(fixtures, plan.state);
    const actual = executeListingQueryPlan(fixtures, plan, { forceScan: true });
    assert.deepEqual(slugsOf(actual.records), slugsOf(expected), JSON.stringify(state));
  }
});

test("indexed executeListingQueryPlan matches oracle", () => {
  const listingIndex = createListingIndexFromRecords(fixtures);
  const states: ListingFilterState[] = [
    { ...baseState, brands: ["Cisco"] },
    { ...baseState, brands: ["Cisco"], tags: ["sale"] },
    { ...baseState, brands: ["Cisco"], logic: "or", tags: ["wifi"] },
    { ...baseState, tags: ["sale"], stockOnly: true },
    { ...baseState, priceMin: 90, priceMax: 130 },
    { ...baseState, variations: { Storage: ["256GB"] }, brands: ["Juniper"] },
    { ...baseState, collections: ["networking"], brands: ["Cisco"] },
  ];

  for (const state of states) {
    const plan = createListingQueryPlan(state);
    const expected = filterListingCatalog(fixtures, plan.state);
    const actual = executeListingQueryPlan(fixtures, plan, { listingIndex });
    assert.deepEqual(slugsOf(actual.records), slugsOf(expected), JSON.stringify(state));
  }
});

test("generated filter combinations stay equivalent", () => {
  const listingIndex = createListingIndexFromRecords(fixtures);
  const brands = [[], ["Cisco"], ["Juniper"], ["Cisco", "Juniper"]];
  const tags = [[], ["sale"], ["new"], ["sale", "wifi"]];
  const logics: Array<ListingFilterState["logic"]> = [undefined, "or"];
  const stocks = [false, true];
  const prices: Array<[number | null, number | null]> = [
    [null, null],
    [50, 150],
    [400, 800],
  ];

  for (const b of brands) {
    for (const t of tags) {
      for (const logic of logics) {
        for (const stockOnly of stocks) {
          for (const [priceMin, priceMax] of prices) {
            const state: ListingFilterState = {
              ...baseState,
              brands: b,
              tags: t,
              ...(logic ? { logic } : {}),
              stockOnly,
              priceMin,
              priceMax,
            };
            const plan = createListingQueryPlan(state);
            const expected = slugsOf(filterListingCatalog(fixtures, plan.state));
            const scan = slugsOf(
              executeListingQueryPlan(fixtures, plan, { forceScan: true }).records,
            );
            const indexed = slugsOf(
              executeListingQueryPlan(fixtures, plan, { listingIndex }).records,
            );
            assert.deepEqual(scan, expected);
            assert.deepEqual(indexed, expected);
          }
        }
      }
    }
  }
});
