import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { applyLegacyWritePolicy, readLegacyField } from "@/features/translation/legacy-adapter";
import { resolveTranslation } from "@/features/translation/translation-resolver";
import { buildHreflangAlternates } from "@/i18n/seo-helpers";

describe("applyLegacyWritePolicy", () => {
  it("strips Ar columns when I18N_WRITE_LEGACY=false", () => {
    const prev = process.env.I18N_WRITE_LEGACY;
    process.env.I18N_WRITE_LEGACY = "false";
    try {
      const result = applyLegacyWritePolicy({
        titleEn: "Hello",
        titleAr: "مرحبا",
        slug: "hello",
      });
      assert.equal(result.titleEn, "Hello");
      assert.equal("titleAr" in result, false);
    } finally {
      process.env.I18N_WRITE_LEGACY = prev;
    }
  });
});

describe("readLegacyField", () => {
  it("reads En/Ar suffix columns", () => {
    const entity = { titleEn: "English", titleAr: "Arabic" };
    assert.equal(readLegacyField(entity, "title", "en"), "English");
    assert.equal(readLegacyField(entity, "title", "ar"), "Arabic");
  });
});

describe("resolveTranslation", () => {
  it("prefers EntityTranslation rows over legacy columns", () => {
    const value = resolveTranslation("title", "fr", {
      translations: [
        {
          id: "1",
          entityType: "CmsPage",
          entityId: "p1",
          field: "title",
          languageCode: "fr",
          value: "French title",
          status: "PUBLISHED",
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
      legacyEntity: { titleEn: "English", titleAr: "Arabic" },
      enabledLocales: [
        {
          code: "en",
          urlPrefix: "en",
          label: "English",
          htmlLang: "en",
          dir: "ltr",
          flag: "🇬🇧",
          isDefault: true,
        },
        {
          code: "fr",
          urlPrefix: "fr",
          label: "French",
          htmlLang: "fr",
          dir: "ltr",
          flag: "🇫🇷",
          isDefault: false,
        },
      ],
      defaultCode: "en",
    });
    assert.equal(value, "French title");
  });
});

describe("buildHreflangAlternates", () => {
  it("builds alternates for all enabled locales", () => {
    const locales = [
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
    const alternates = buildHreflangAlternates(
      "/pages/about",
      locales,
      "https://example.com",
      { ar: "about-ar" }
    );
    assert.equal(alternates.en, "https://example.com/en/pages/about");
    assert.equal(alternates.ar, "https://example.com/ar/pages/about-ar");
    assert.equal(alternates["x-default"], "https://example.com/en/pages/about");
  });
});
