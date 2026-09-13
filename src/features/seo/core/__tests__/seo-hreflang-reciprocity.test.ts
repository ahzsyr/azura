import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { evaluateHreflangReciprocity } from "@/features/seo/core/seo-hreflang-reciprocity";

describe("evaluateHreflangReciprocity", () => {
  it("skips x-default and accepts symmetric EN/AR", () => {
    const issues = evaluateHreflangReciprocity({
      sourceCanonical: "https://example.com/about",
      languages: {
        en: "https://example.com/about",
        ar: "https://example.com/ar/about",
        "x-default": "https://example.com/about",
      },
      reverseLanguagesByUrl: {
        "https://example.com/about": {
          en: "https://example.com/about",
          ar: "https://example.com/ar/about",
          "x-default": "https://example.com/",
        },
        "https://example.com/ar/about": {
          en: "https://example.com/about",
          ar: "https://example.com/ar/about",
          "x-default": "https://example.com/",
        },
      },
    });
    assert.equal(issues.length, 0);
  });

  it("flags missing reverse locale without treating x-default as a pair", () => {
    const issues = evaluateHreflangReciprocity({
      sourceCanonical: "https://example.com/about",
      languages: {
        en: "https://example.com/about",
        ar: "https://example.com/ar/about",
        "x-default": "https://example.com/",
      },
      reverseLanguagesByUrl: {
        "https://example.com/about": {
          en: "https://example.com/about",
          "x-default": "https://example.com/",
        },
        "https://example.com/ar/about": {
          ar: "https://example.com/ar/about",
          "x-default": "https://example.com/",
        },
      },
    });
    assert.ok(issues.some((issue) => issue.hrefLang === "ar"));
    assert.equal(
      issues.some((issue) => issue.hrefLang === "x-default"),
      false,
    );
  });
});
