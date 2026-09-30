/**
 * parseMarketingPath matrix for localePrefix: "as-needed".
 * Run: npx tsx --test src/features/seo/platform/schema-pipeline/context/__tests__/parse-marketing-path.test.ts
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseMarketingPath } from "../parse-marketing-path";

const PREFIXES = ["en", "ar"];

describe("parseMarketingPath (as-needed English)", () => {
  it("maps / to English home", () => {
    const parsed = parseMarketingPath("/", PREFIXES, "en");
    assert.deepEqual(parsed, {
      localePrefix: "en",
      path: "/",
      pageType: "static",
      pageKey: "home",
    });
  });

  it("maps /en to English home (parseable; public still redirects)", () => {
    const parsed = parseMarketingPath("/en", PREFIXES, "en");
    assert.deepEqual(parsed, {
      localePrefix: "en",
      path: "/",
      pageType: "static",
      pageKey: "home",
    });
  });

  it("maps /ar to Arabic home", () => {
    const parsed = parseMarketingPath("/ar", PREFIXES, "en");
    assert.deepEqual(parsed, {
      localePrefix: "ar",
      path: "/",
      pageType: "static",
      pageKey: "home",
    });
  });

  it("maps /about to English about", () => {
    const parsed = parseMarketingPath("/about", PREFIXES, "en");
    assert.deepEqual(parsed, {
      localePrefix: "en",
      path: "/about",
      pageType: "static",
      pageKey: "about",
    });
  });

  it("maps /en/about to English about", () => {
    const parsed = parseMarketingPath("/en/about", PREFIXES, "en");
    assert.deepEqual(parsed, {
      localePrefix: "en",
      path: "/about",
      pageType: "static",
      pageKey: "about",
    });
  });

  it("maps /ar/about to Arabic about", () => {
    const parsed = parseMarketingPath("/ar/about", PREFIXES, "en");
    assert.deepEqual(parsed, {
      localePrefix: "ar",
      path: "/about",
      pageType: "static",
      pageKey: "about",
    });
  });

  it("maps /contact to English contact", () => {
    const parsed = parseMarketingPath("/contact", PREFIXES, "en");
    assert.equal(parsed?.pageKey, "contact");
    assert.equal(parsed?.localePrefix, "en");
  });

  it("maps /products to English products", () => {
    const parsed = parseMarketingPath("/products", PREFIXES, "en");
    assert.equal(parsed?.pageKey, "products");
    assert.equal(parsed?.localePrefix, "en");
  });

  it("maps /solutions to English solutions", () => {
    const parsed = parseMarketingPath("/solutions", PREFIXES, "en");
    assert.ok(parsed);
    assert.equal(parsed.localePrefix, "en");
    assert.equal(parsed.path, "/solutions");
    assert.equal(parsed.pageKey, "solutions");
  });

  it("never returns null for /", () => {
    assert.notEqual(parseMarketingPath("/", PREFIXES, "en"), null);
  });
});
