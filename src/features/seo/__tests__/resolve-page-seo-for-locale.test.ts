import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { EntityTranslation } from "@prisma/client";
import {
  parseJsonLdTranslation,
  resolveLocalizedSeoExtras,
} from "@/features/seo/localized-seo-fields";

const LOCALES = [
  {
    code: "en",
    urlPrefix: "en",
    label: "English",
    htmlLang: "en",
    dir: "ltr" as const,
    flag: "🇬🇧",
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

function translation(
  field: string,
  localeCode: string,
  value: string,
): EntityTranslation {
  return {
    id: `${field}-${localeCode}`,
    entityType: "SeoMeta",
    entityId: "meta-1",
    field,
    localeCode,
    value,
    status: "PUBLISHED",
    version: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

const columnMeta = {
  focusKeywords: "column keywords",
  jsonLd: { "@type": "WebPage", name: "Column JSON-LD" },
  canonicalUrl: "https://example.com/ar",
};

describe("parseJsonLdTranslation", () => {
  it("parses valid JSON objects", () => {
    assert.deepEqual(parseJsonLdTranslation('{"@type":"WebPage"}'), {
      "@type": "WebPage",
    });
  });

  it("returns null for empty or invalid JSON", () => {
    assert.equal(parseJsonLdTranslation(""), null);
    assert.equal(parseJsonLdTranslation("  "), null);
    assert.equal(parseJsonLdTranslation(null), null);
    assert.equal(parseJsonLdTranslation("{bad"), null);
  });
});

describe("resolveLocalizedSeoExtras", () => {
  it("uses per-locale EntityTranslation over SeoMeta columns", () => {
    const ctx = {
      translations: [
        translation("focusKeywords", "en", "wireless, dubai"),
        translation("focusKeywords", "ar", "شبكات, دبي"),
        translation("jsonLd", "en", '{"@type":"WebPage","name":"Home EN"}'),
        translation("jsonLd", "ar", '{"@type":"WebPage","name":"الرئيسية"}'),
        translation("canonicalUrl", "en", "https://example.com/en"),
        translation("canonicalUrl", "ar", "https://example.com/ar"),
      ],
      enabledLocales: LOCALES,
      defaultCode: "en",
    };

    const en = resolveLocalizedSeoExtras("en", ctx, columnMeta);
    const ar = resolveLocalizedSeoExtras("ar", ctx, columnMeta);

    assert.equal(en.focusKeywords, "wireless, dubai");
    assert.equal(ar.focusKeywords, "شبكات, دبي");
    assert.deepEqual(en.jsonLd, { "@type": "WebPage", name: "Home EN" });
    assert.deepEqual(ar.jsonLd, { "@type": "WebPage", name: "الرئيسية" });
    assert.equal(en.canonicalUrl, "https://example.com/en");
    assert.equal(ar.canonicalUrl, "https://example.com/ar");
  });

  it("falls back to SeoMeta columns when translations are missing", () => {
    const result = resolveLocalizedSeoExtras(
      "ar",
      { translations: [], enabledLocales: LOCALES, defaultCode: "en" },
      columnMeta,
    );

    assert.equal(result.focusKeywords, "column keywords");
    assert.deepEqual(result.jsonLd, { "@type": "WebPage", name: "Column JSON-LD" });
    assert.equal(result.canonicalUrl, "https://example.com/ar");
  });

  it("falls back to English translation before column values for keywords/jsonLd", () => {
    const result = resolveLocalizedSeoExtras(
      "ar",
      {
        translations: [
          translation("focusKeywords", "en", "english keywords"),
          translation("jsonLd", "en", '{"@type":"WebPage","name":"English LD"}'),
          translation("canonicalUrl", "en", "https://example.com/en"),
        ],
        enabledLocales: LOCALES,
        defaultCode: "en",
      },
      columnMeta,
    );

    assert.equal(result.focusKeywords, "english keywords");
    assert.deepEqual(result.jsonLd, { "@type": "WebPage", name: "English LD" });
    // Canonical must not inherit another locale's URL
    assert.equal(result.canonicalUrl, "https://example.com/ar");
  });
});
