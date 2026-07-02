import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { resolveItemField, resolveTopLevelField } from "@/features/builder/blocks/marketing/lib/resolve-item-locale";
import type { PublicLocale } from "@/i18n/locale-config";

const locales: PublicLocale[] = [
  { code: "en", urlPrefix: "en", label: "English", htmlLang: "en", dir: "ltr", flag: "🇺🇸", isDefault: true },
  { code: "fr", urlPrefix: "fr", label: "French", htmlLang: "fr", dir: "ltr", flag: "🇫🇷", isDefault: false },
  { code: "id", urlPrefix: "id", label: "Indonesian", htmlLang: "id", dir: "ltr", flag: "🇮🇩", isDefault: false },
];

describe("resolveItemField", () => {
  it("reads dynamic suffix for enabled locale", () => {
    const item = { labelEn: "Feature", labelFr: "Fonction" };
    assert.equal(
      resolveItemField(item, "label", "fr", { enabledLocales: locales }),
      "Fonction"
    );
  });

  it("reads underscore legacy suffix for non-En/Ar locales", () => {
    const item = { title_en: "English", title_id: "Judul" };
    assert.equal(
      resolveItemField(item, "title", "id", { enabledLocales: locales }),
      "Judul"
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

describe("resolveTopLevelField", () => {
  it("prefers merged base field over legacy English suffix", () => {
    const props = { title: "Titre français", titleEn: "English title" };
    assert.equal(resolveTopLevelField(props, "title", "fr", { enabledLocales: locales }), "Titre français");
  });

  it("falls back to suffixed props when merged base is empty", () => {
    const props = { title: "", messageFr: "Bonjour" };
    assert.equal(resolveTopLevelField(props, "message", "fr", { enabledLocales: locales }), "Bonjour");
  });
});
