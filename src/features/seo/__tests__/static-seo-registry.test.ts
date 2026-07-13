import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { isStaticSeoPageKey, STATIC_SEO_PAGES } from "@/features/seo/constants";

/**
 * Marketing listing routes that use a fixed pageKey in generateMetadata.
 * Update this list when adding a new top-level marketing page; also add to STATIC_SEO_PAGES.
 */
const MARKETING_LISTING_PAGE_KEYS = [
  "home",
  "about",
  "packages",
  "products",
  "collections",
  "services",
  "compare",
  "favorites",
  "account",
  "hotels-transport",
  "gallery",
  "testimonials",
  "contact",
  "blog",
  "faq",
  "smart-home",
  "security-solutions",
  "enterprise-wireless",
] as const;

describe("STATIC_SEO_PAGES registry", () => {
  it("includes every known marketing listing pageKey", () => {
    const registryKeys = new Set(STATIC_SEO_PAGES.map((p) => p.pageKey));
    for (const key of MARKETING_LISTING_PAGE_KEYS) {
      assert.ok(
        registryKeys.has(key),
        `Missing STATIC_SEO_PAGES entry for marketing pageKey "${key}"`,
      );
    }
  });

  it("has unique pageKey values", () => {
    const keys = STATIC_SEO_PAGES.map((p) => p.pageKey);
    assert.equal(keys.length, new Set(keys).size);
  });

  it("isStaticSeoPageKey matches registry", () => {
    for (const page of STATIC_SEO_PAGES) {
      assert.ok(isStaticSeoPageKey(page.pageKey));
    }
    assert.ok(!isStaticSeoPageKey("not-a-page"));
  });
});
