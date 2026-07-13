import { test } from "node:test";
import assert from "node:assert/strict";
import {
  normalizeEntityTypes,
  normalizeFacetFilters,
  normalizeSearchQuery,
} from "@/capabilities/search/query/normalize-search-query";
import {
  searchAutocompleteKey,
  searchResultsKey,
} from "@/capabilities/search/query/search-query-keys";

test("normalizeSearchQuery collapses case and whitespace", () => {
  assert.equal(normalizeSearchQuery(" Phone "), "phone");
  assert.equal(normalizeSearchQuery("PHONE"), "phone");
  assert.equal(normalizeSearchQuery("  phone   case"), "phone case");
});

test("normalizeFacetFilters sorts keys and values", () => {
  assert.deepEqual(
    normalizeFacetFilters({ brand: ["Z", "A"], contentType: ["b", "a"] }),
    { brand: ["A", "Z"], contentType: ["a", "b"] }
  );
});

test("search query keys are stable for equivalent inputs", () => {
  const a = searchAutocompleteKey({
    locale: "en",
    q: " Phone ",
    types: ["POST", "CMS_PAGE"],
    facets: { brand: ["Apple"] },
  });
  const b = searchAutocompleteKey({
    locale: "en",
    q: "phone",
    types: ["CMS_PAGE", "POST"],
    facets: { brand: ["Apple"] },
  });
  assert.deepEqual(a, b);
});

test("searchResultsKey includes pagination fields", () => {
  const key = searchResultsKey({
    locale: "en",
    q: "phone",
    offset: 20,
    limit: 20,
  });
  assert.ok(key.includes(20));
});

test("normalizeEntityTypes deduplicates and sorts", () => {
  assert.deepEqual(normalizeEntityTypes(["POST", "CMS_PAGE", "POST"]), ["CMS_PAGE", "POST"]);
});
