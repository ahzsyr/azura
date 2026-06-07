import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { resolveItemField } from "@/features/marketing-blocks/lib/resolve-item-locale";
import type { PublicLocale } from "@/i18n/locale-config";

const locales: PublicLocale[] = [
  { code: "en", urlPrefix: "en", label: "English", htmlLang: "en", dir: "ltr", flag: "🇺🇸", isDefault: true },
  { code: "fr", urlPrefix: "fr", label: "French", htmlLang: "fr", dir: "ltr", flag: "🇫🇷", isDefault: false },
];

describe("resolveItemField", () => {
  it("reads dynamic suffix for enabled locale", () => {
    const item = { labelEn: "Feature", labelFr: "Fonction" };
    assert.equal(
      resolveItemField(item, "label", "fr", { enabledLocales: locales }),
      "Fonction"
    );
  });

  it("falls back to English when translation missing", () => {
    const item = { labelEn: "Feature" };
    assert.equal(
      resolveItemField(item, "label", "fr", { enabledLocales: locales }),
      "Feature"
    );
  });
});
