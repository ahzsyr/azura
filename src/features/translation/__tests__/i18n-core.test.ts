import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { resolveTranslation } from "@/features/translation/translation-resolver";
import { buildHreflangAlternates } from "@/i18n/seo-helpers";

describe("resolveTranslation", () => {
  it("returns EntityTranslation for requested locale", () => {
    const value = resolveTranslation("title", "fr", {
      translations: [
        {
          id: "1",
          entityType: "CmsPage",
          entityId: "p1",
          field: "title",
          localeCode: "fr",
          value: "French title",
          status: "PUBLISHED",
          version: 1,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
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
