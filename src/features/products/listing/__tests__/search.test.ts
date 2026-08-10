import assert from "node:assert/strict";
import test from "node:test";

import {
  buildListingSearchIndex,
  rankListingSearchResults,
  scoreSearchMatch,
  searchListingCandidates,
  tokenizeListingQuery,
} from "../search/listing-search-engine";
import type { ProductListingRecord } from "../types";

function record(slug: string, overrides: Partial<ProductListingRecord> = {}): ProductListingRecord {
  return {
    slug,
    id: slug,
    name: slug,
    brand: "Apple",
    category: "Phones",
    categories: ["Phones"],
    tags: [],
    price: { value: 100, currency: "USD" },
    priceMin: 100,
    priceMax: 100,
    in_stock: true,
    conditions: [],
    variationFacets: {},
    collectionSlugs: [],
    searchText: `${slug} apple phone`,
    ...overrides,
  };
}

const records = [
  record("iphone-15-pro", { name: "iPhone 15 Pro", mpn: "IP15P", tags: ["5g"] }),
  record("iphone-16", { name: "iPhone 16", mpn: "IP16" }),
  record("pixel-8", { name: "Pixel 8", brand: "Google", searchText: "pixel 8 google phone" }),
];

test("tokenizeListingQuery strips punctuation and case", () => {
  assert.deepEqual(tokenizeListingQuery("iPhone-15 Pro!"), ["iphone", "15", "pro"]);
});

test("searchListingCandidates finds token intersection", () => {
  const index = buildListingSearchIndex(records);
  const { candidates, mode } = searchListingCandidates(index, "iphone 15");
  assert.equal(mode, "token");
  assert.ok(candidates.includes(0));
});

test("prefix search finds iphone from iph", () => {
  const index = buildListingSearchIndex(records);
  const { candidates, mode } = searchListingCandidates(index, "iph");
  assert.ok(mode === "prefix" || candidates.length > 0);
  assert.ok(candidates.length >= 1);
});

test("scoreSearchMatch prefers exact SKU / title", () => {
  const sku = scoreSearchMatch(records[0], "IP15P");
  const title = scoreSearchMatch(records[0], "iPhone 15 Pro");
  const weak = scoreSearchMatch(records[0], "phone");
  assert.ok(sku >= title);
  assert.ok(title > weak);
});

test("rankListingSearchResults orders by score", () => {
  const ranked = rankListingSearchResults(records, "iphone");
  assert.equal(ranked[0].slug.startsWith("iphone"), true);
});
