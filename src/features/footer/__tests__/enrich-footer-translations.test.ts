import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { resolveTranslation } from "@/features/translation/translation-resolver";

describe("footer copyright tagline runtime", () => {
  it("resolves Footer.tagline translation for Arabic locale", () => {
    const value = resolveTranslation("tagline", "ar", {
      translations: [
        {
          id: "t1",
          entityType: "Footer",
          entityId: "foot-entity",
          field: "tagline",
          localeCode: "ar",
          value: "جميع الحقوق محفوظة",
          version: 1,
          status: "PUBLISHED",
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
      enabledLocales: [
        { code: "en", urlPrefix: "en", label: "English", htmlLang: "en", dir: "ltr", flag: "🇺🇸", isDefault: true },
        { code: "ar", urlPrefix: "ar", label: "Arabic", htmlLang: "ar", dir: "rtl", flag: "🇸🇦", isDefault: false },
      ],
      defaultCode: "en",
    });

    assert.equal(value, "جميع الحقوق محفوظة");
  });
});
