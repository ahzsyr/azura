import assert from "node:assert/strict";
import test from "node:test";

import {
  buildListingQueryCacheKey,
  clearListingQueryCache,
  getCachedListingQuery,
  listingQueryCacheSize,
  setCachedListingQuery,
  shouldCacheListingQuery,
} from "../cache/query-cache";
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

test("shouldCacheListingQuery admits simple queries", () => {
  assert.equal(shouldCacheListingQuery(base), true);
  assert.equal(shouldCacheListingQuery({ ...base, brands: ["Apple"] }), true);
  assert.equal(
    shouldCacheListingQuery({
      ...base,
      brands: ["A", "B"],
      tags: ["t1", "t2"],
      categories: ["c1", "c2"],
      conditions: ["new"],
    }),
    false,
  );
});

test("query cache stores and retrieves by canonical key", () => {
  process.env.CATALOG_QUERY_CACHE = "1";
  clearListingQueryCache();
  const key = buildListingQueryCacheKey({
    locale: "en",
    listingMode: "product",
    state: { ...base, brands: ["Cisco"] },
  });
  setCachedListingQuery(key, {
    records: [],
    facets: {
      collections: [],
      categories: [],
      brands: [],
      tags: [],
      conditions: [],
      variations: {},
      priceMin: 0,
      priceMax: 0,
      currency: "USD",
    },
    total: 0,
    totalPages: 1,
  });
  // Empty records are stored — get still works when we set non-empty
  assert.ok(listingQueryCacheSize() >= 0);
  const hit = getCachedListingQuery(key);
  assert.ok(hit);
  clearListingQueryCache();
  delete process.env.CATALOG_QUERY_CACHE;
});
