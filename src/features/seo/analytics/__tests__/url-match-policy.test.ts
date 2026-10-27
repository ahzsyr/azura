import assert from "node:assert/strict";
import test from "node:test";
import { normalizeUrlForSiteMatch, urlsMatchUnderSitePolicy } from "../url-match-policy";

test("normalizeUrlForSiteMatch collapses www apex and trailing slash", () => {
  const origin = "https://example.com";
  const a = normalizeUrlForSiteMatch("https://www.example.com/about/", origin);
  const b = normalizeUrlForSiteMatch("https://example.com/about", origin);
  assert.equal(a, b);
});

test("urlsMatchUnderSitePolicy rejects foreign hosts", () => {
  const origin = "https://example.com";
  assert.equal(
    urlsMatchUnderSitePolicy("https://example.com/products", "https://example.com/products/", origin),
    true,
  );
  assert.equal(
    normalizeUrlForSiteMatch("https://other.example/products", origin),
    null,
  );
});
