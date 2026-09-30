import assert from "node:assert/strict";
import test from "node:test";

import { buildSearchTokens } from "@/features/products/index/search-token-index";
import { PRODUCT_INDEX_SEMANTIC_VERSIONS } from "@/features/products/index/product-index-types";
import type { IndexedProductListingRecord } from "@/features/products/index/product-index-types";

function record(overrides: Partial<IndexedProductListingRecord>): IndexedProductListingRecord {
  return {
    slug: "cisco-network-switch",
    id: "p1",
    name: "Cisco Networking Switch",
    brand: "Cisco",
    category: "Networking",
    categories: ["Networking"],
    tags: ["Switching"],
    price: { value: 100, currency: "USD" },
    priceMin: 100,
    priceMax: 100,
    in_stock: true,
    conditions: [],
    variationFacets: {},
    collectionSlugs: ["networking"],
    searchText: "cisco networking switch",
    ...overrides,
  };
}

test("buildSearchTokens includes bounded prefix tokens", () => {
  const tokens = buildSearchTokens([record({})]);

  assert.deepEqual(tokens.cisco, ["cisco-network-switch"]);
  assert.deepEqual(tokens.net, ["cisco-network-switch"]);
  assert.deepEqual(tokens.network, ["cisco-network-switch"]);
  assert.equal(tokens.n, undefined);
  assert.equal(tokens.networkin, undefined);
});

test("product index semantic versions are explicit", () => {
  assert.equal(PRODUCT_INDEX_SEMANTIC_VERSIONS.schemaVersion > 0, true);
  assert.equal(PRODUCT_INDEX_SEMANTIC_VERSIONS.tokenizationVersion > 0, true);
  assert.equal(PRODUCT_INDEX_SEMANTIC_VERSIONS.facetSchemaVersion > 0, true);
  assert.equal(PRODUCT_INDEX_SEMANTIC_VERSIONS.rankingVersion > 0, true);
});
