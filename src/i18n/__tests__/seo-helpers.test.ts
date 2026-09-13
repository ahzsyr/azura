import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  buildCanonicalUrl,
  buildHreflangAlternates,
  normalizeStoredCanonicalUrl,
} from "../seo-helpers";
import { violatesSeoApexUrlInvariants } from "@/lib/preferred-host";

const SITE = "https://brt-me.com";
const LOCALES = [
  {
    code: "en",
    urlPrefix: "en",
    label: "English",
    htmlLang: "en",
    dir: "ltr" as const,
    flag: "🇺🇸",
    isDefault: true,
  },
  {
    code: "ar",
    urlPrefix: "ar",
    label: "Arabic",
    htmlLang: "ar",
    dir: "rtl" as const,
    flag: "🇸🇦",
    isDefault: false,
  },
];

describe("buildCanonicalUrl", () => {
  it("uses apex home for English", () => {
    assert.equal(buildCanonicalUrl(SITE, "en", "", undefined, "en"), `${SITE}/`);
    assert.equal(buildCanonicalUrl(SITE, "en", "/about", undefined, "en"), `${SITE}/about`);
  });

  it("keeps Arabic prefix", () => {
    assert.equal(buildCanonicalUrl(SITE, "ar", "/about", undefined, "en"), `${SITE}/ar/about`);
  });
});

describe("buildHreflangAlternates", () => {
  it("sets x-default to apex home", () => {
    const alternates = buildHreflangAlternates("", LOCALES, SITE);
    assert.equal(alternates["x-default"], `${SITE}/`);
    assert.equal(alternates.en, `${SITE}/`);
    assert.equal(alternates.ar, `${SITE}/ar`);
  });
});

describe("normalizeStoredCanonicalUrl", () => {
  it("rewrites legacy /en canonicals to unprefixed", () => {
    assert.equal(
      normalizeStoredCanonicalUrl("https://brt-me.com/en", SITE, "en"),
      `${SITE}/`,
    );
    assert.equal(
      normalizeStoredCanonicalUrl("https://brt-me.com/en/about", SITE, "en"),
      `${SITE}/about`,
    );
  });

  it("rewrites www twin + /en to apex unprefixed", () => {
    assert.equal(
      normalizeStoredCanonicalUrl("https://www.brt-me.com/", SITE, "en"),
      `${SITE}/`,
    );
    assert.equal(
      normalizeStoredCanonicalUrl("https://www.brt-me.com/en", SITE, "en"),
      `${SITE}/`,
    );
    assert.equal(
      normalizeStoredCanonicalUrl("https://www.brt-me.com/en/about", SITE, "en"),
      `${SITE}/about`,
    );
  });

  it("leaves external origins unchanged", () => {
    assert.equal(
      normalizeStoredCanonicalUrl("https://other.example/en", SITE, "en"),
      "https://other.example/en",
    );
  });
});

describe("SEO apex URL invariants", () => {
  it("canonical and hreflang never emit www, http, or /en", () => {
    const urls = [
      buildCanonicalUrl("https://www.brt-me.com", "en", "/", undefined, "en"),
      buildCanonicalUrl(SITE, "en", "/about", undefined, "en"),
      ...Object.values(buildHreflangAlternates("/about", LOCALES, "https://www.brt-me.com")),
      ...Object.values(buildHreflangAlternates("/", LOCALES, SITE)),
    ];
    for (const url of urls) {
      assert.equal(
        violatesSeoApexUrlInvariants(url),
        null,
        `invariant failed for ${url}`,
      );
      assert.ok(url.startsWith("https://brt-me.com"), url);
    }
  });
});
