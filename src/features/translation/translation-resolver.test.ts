import { describe, expect, it } from "vitest";
import {
  resolveTranslation,
  resolveWithEnglishFallback,
} from "@/features/translation/translation-resolver";
import type { PublicLocale } from "@/i18n/locale-config";

const enabledLocales: PublicLocale[] = [
  { code: "en", urlPrefix: "en", label: "English", htmlLang: "en", dir: "ltr", flag: "🇺🇸", isDefault: true },
  { code: "ar", urlPrefix: "ar", label: "Arabic", htmlLang: "ar", dir: "rtl", flag: "🇸🇦", isDefault: false },
  { code: "id", urlPrefix: "id", label: "Indonesian", htmlLang: "id", dir: "ltr", flag: "🇮🇩", isDefault: false },
];

describe("resolveTranslation", () => {
  it("returns EntityTranslation for requested locale", () => {
    const value = resolveTranslation("title", "id", {
      enabledLocales,
      defaultCode: "en",
      translations: [
        {
          field: "title",
          languageCode: "id",
          value: "Judul Indonesia",
          status: "PUBLISHED",
        } as never,
      ],
      legacyEntity: { titleEn: "English Title", titleAr: "Arabic Title" },
    });
    expect(value).toBe("Judul Indonesia");
  });

  it("falls back to English legacy column when locale missing", () => {
    const value = resolveTranslation("title", "id", {
      enabledLocales,
      defaultCode: "en",
      legacyEntity: { titleEn: "English Title", titleAr: "Arabic Title" },
    });
    expect(value).toBe("English Title");
  });

  it("resolveWithEnglishFallback tries en explicitly after empty chain", () => {
    const value = resolveWithEnglishFallback("title", "id", {
      enabledLocales,
      defaultCode: "en",
      translations: [
        { field: "title", languageCode: "en", value: "English from DB", status: "PUBLISHED" } as never,
      ],
    });
    expect(value).toBe("English from DB");
  });
});
