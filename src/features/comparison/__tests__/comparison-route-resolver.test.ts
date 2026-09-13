import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  compareHubPath,
  comparePagePath,
  resolveCompareContentTypeSlug,
} from "@/features/comparison/comparison-route-resolver";

describe("resolveCompareContentTypeSlug", () => {
  it("maps legacy package segments to catalog-items", () => {
    assert.equal(resolveCompareContentTypeSlug("packages"), "catalog-items");
    assert.equal(resolveCompareContentTypeSlug("package"), "catalog-items");
    assert.equal(resolveCompareContentTypeSlug("catalog-items"), "catalog-items");
  });

  it("maps listings and offerings distinctly", () => {
    assert.equal(resolveCompareContentTypeSlug("listings"), "listings");
    assert.equal(resolveCompareContentTypeSlug("offerings"), "offerings");
  });

  it("maps legacy catalog source slugs", () => {
    assert.equal(resolveCompareContentTypeSlug("hotels"), "listings");
    assert.equal(resolveCompareContentTypeSlug("services"), "offerings");
  });

  it("passes through unknown segments normalized", () => {
    assert.equal(resolveCompareContentTypeSlug("  Products "), "products");
  });
});

describe("comparePagePath", () => {
  it("uses content type slug in the URL", () => {
    assert.equal(comparePagePath("en-us", "catalog-items"), "/en-us/compare/catalog-items");
    assert.equal(comparePagePath("en-us", "listings"), "/en-us/compare/listings");
    assert.equal(comparePagePath("en-us", "offerings"), "/en-us/compare/offerings");
  });
});

describe("compareHubPath", () => {
  it("returns hub path with optional type query", () => {
    assert.equal(compareHubPath("en-us"), "/en-us/compare");
    assert.equal(compareHubPath("en-us", "catalog-items"), "/en-us/compare?type=catalog-items");
    assert.equal(compareHubPath("en-us", "listings"), "/en-us/compare?type=listings");
  });
});
