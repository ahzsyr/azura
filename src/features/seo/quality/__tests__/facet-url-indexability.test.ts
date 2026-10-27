import assert from "node:assert/strict";
import test from "node:test";
import {
  assertFilterUrlNotPriorityIndexable,
  evaluateFacetUrlIndexability,
  hasFacetFilterParams,
} from "../facet-url-indexability";

test("clean category URL is priority-indexable", () => {
  const verdict = evaluateFacetUrlIndexability("/categories/routers");
  assert.equal(verdict.isFacetFiltered, false);
  assert.equal(verdict.isPriorityIndexable, true);
});

test("filter URL must not be priority-indexable", () => {
  const verdict = assertFilterUrlNotPriorityIndexable(
    "/categories/routers?brand=cisco&tag=wifi",
  );
  assert.equal(verdict.isFacetFiltered, true);
  assert.equal(verdict.isPriorityIndexable, false);
});

test("pagination alone is not priority-indexable", () => {
  const verdict = evaluateFacetUrlIndexability("/categories/routers?page=2");
  assert.equal(verdict.isFacetFiltered, true);
  assert.equal(verdict.isPriorityIndexable, false);
});

test("hasFacetFilterParams detects listing query keys", () => {
  assert.equal(hasFacetFilterParams(new URLSearchParams("brand=acme")), true);
  assert.equal(hasFacetFilterParams(new URLSearchParams()), false);
});
