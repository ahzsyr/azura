import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  isPaginatedListingPath,
  normalizeCanonicalForGoogle,
} from "@/features/seo/core/seo-canonical-google";

describe("isPaginatedListingPath", () => {
  it("treats listing indexes as paginated", () => {
    assert.equal(isPaginatedListingPath("/blog"), true);
    assert.equal(isPaginatedListingPath("/ar/products"), true);
    assert.equal(isPaginatedListingPath("/categories"), true);
  });

  it("rejects detail and home paths", () => {
    assert.equal(isPaginatedListingPath("/"), false);
    assert.equal(isPaginatedListingPath("/blog/my-post"), false);
    assert.equal(isPaginatedListingPath("/products/router"), false);
  });
});

describe("normalizeCanonicalForGoogle", () => {
  it("strips tracking params", () => {
    assert.equal(
      normalizeCanonicalForGoogle(
        "https://example.com/about?utm_source=ad&gclid=abc&fbclid=1&keep=no",
      ),
      "https://example.com/about",
    );
  });

  it("keeps page on listing routes and still drops tracking", () => {
    assert.equal(
      normalizeCanonicalForGoogle("https://example.com/blog?page=2&utm_source=x"),
      "https://example.com/blog?page=2",
    );
    assert.equal(
      normalizeCanonicalForGoogle("https://example.com/ar/categories?p=3&gclid=zz"),
      "https://example.com/ar/categories?p=3",
    );
  });

  it("drops page on product/detail URLs unless allowlisted", () => {
    assert.equal(
      normalizeCanonicalForGoogle("https://example.com/products/router?page=2"),
      "https://example.com/products/router",
    );
    assert.equal(
      normalizeCanonicalForGoogle("https://example.com/products/router?page=2", {
        allowlist: ["page"],
      }),
      "https://example.com/products/router?page=2",
    );
  });

  it("upgrades http to https except localhost", () => {
    assert.equal(
      normalizeCanonicalForGoogle("http://example.com/about?utm_medium=cpc"),
      "https://example.com/about",
    );
    assert.equal(
      normalizeCanonicalForGoogle("http://localhost:3000/about?gclid=1"),
      "http://localhost:3000/about",
    );
  });
});
