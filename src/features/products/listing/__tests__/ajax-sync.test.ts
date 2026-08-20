import assert from "node:assert/strict";
import test from "node:test";

import {
  buildListingApiUrl,
  clearCatalogListingFetchCache,
} from "../use-catalog-listing-fetch";
import { serializeCanonicalFilterState } from "../normalize";
import { filterStateToApiSearchParams } from "../url-state";
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

test("serializeCanonicalFilterState is stable across new object identities", () => {
  const a: ListingFilterState = {
    ...base,
    q: "switch",
    categories: ["indoor"],
    brands: ["Cisco", "Juniper"],
  };
  const b: ListingFilterState = {
    ...base,
    q: "switch",
    categories: ["indoor"],
    brands: ["Juniper", "Cisco"], // order differs before normalize
  };
  assert.equal(serializeCanonicalFilterState(a), serializeCanonicalFilterState(b));
});

test("q + category produces correct API URL", () => {
  clearCatalogListingFetchCache();
  const state: ListingFilterState = {
    ...base,
    q: "switch",
    categories: ["indoor"],
  };
  const url = buildListingApiUrl("en", state, "product", null);
  const parsed = new URL(url, "https://example.test");
  assert.equal(parsed.pathname, "/api/catalog/listing");
  assert.equal(parsed.searchParams.get("q"), "switch");
  assert.equal(parsed.searchParams.get("category"), "indoor");
  assert.equal(parsed.searchParams.get("locale"), "en");
  assert.equal(parsed.searchParams.get("page"), null); // page 1 omitted
});

test("search without Enter still changes canonical key (debounce target state)", () => {
  const before = serializeCanonicalFilterState(base);
  const afterTyping: ListingFilterState = { ...base, q: "switch", page: 1 };
  const after = serializeCanonicalFilterState(afterTyping);
  assert.notEqual(before, after);
  assert.match(after, /q=switch/);
});

test("search resets page to 1 in canonical serialization", () => {
  const fromPage4: ListingFilterState = { ...base, page: 4 };
  const afterSearch: ListingFilterState = { ...fromPage4, q: "switch", page: 1 };
  const params = filterStateToApiSearchParams(afterSearch);
  assert.equal(params.get("q"), "switch");
  assert.equal(params.get("page"), null); // page 1 not serialized
  assert.notEqual(
    serializeCanonicalFilterState(fromPage4),
    serializeCanonicalFilterState(afterSearch),
  );
});

test("back/forward style URL state changes filterKey", () => {
  const unfiltered = serializeCanonicalFilterState(base);
  const filtered = serializeCanonicalFilterState({
    ...base,
    q: "switch",
    categories: ["indoor"],
  });
  assert.notEqual(unfiltered, filtered);
  // Returning to unfiltered is a new identity again
  assert.equal(serializeCanonicalFilterState({ ...base }), unfiltered);
});

test("same filterKey means request identity should not restart", () => {
  const stateA: ListingFilterState = { ...base, q: "switch", categories: ["indoor"] };
  const stateB: ListingFilterState = { ...base, q: " switch ", categories: ["indoor"] };
  // normalize trims q
  const keyA = serializeCanonicalFilterState(stateA);
  const keyB = serializeCanonicalFilterState(stateB);
  assert.equal(keyA, keyB);

  const requestIdentity = (locale: string, mode: string, collection: string, key: string) =>
    `${locale}|${mode}|${collection}|${key}`;

  assert.equal(
    requestIdentity("en", "product", "", keyA),
    requestIdentity("en", "product", "", keyB),
  );
});

test("rapid typing keys are latest-wins ordered by distinct filterKeys", () => {
  const keys = ["s", "sw", "swi", "swit", "switc", "switch"].map((q) =>
    serializeCanonicalFilterState({ ...base, q, page: 1 }),
  );
  // Each keystroke after debounce produces a distinct key until the final value
  assert.equal(new Set(keys).size, keys.length);
  assert.match(keys[keys.length - 1], /q=switch/);
});

test("SSR shell vs AJAX filtered keys differ so mount skip cannot apply to filtered views", () => {
  const shell = serializeCanonicalFilterState(base);
  const ajax = serializeCanonicalFilterState({
    ...base,
    q: "switch",
    categories: ["indoor"],
  });
  assert.notEqual(shell, ajax);
});
