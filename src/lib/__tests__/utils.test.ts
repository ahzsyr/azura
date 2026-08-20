import test from "node:test";
import assert from "node:assert/strict";
import { getLocalizedField } from "@/lib/utils";
import type { PublicLocale } from "@/i18n/locale-config";

const LOCALES: PublicLocale[] = [
  {
    code: "en",
    urlPrefix: "en",
    label: "English",
    htmlLang: "en",
    dir: "ltr",
    flag: "us",
    isDefault: true,
  },
  {
    code: "fr",
    urlPrefix: "fr",
    label: "French",
    htmlLang: "fr",
    dir: "ltr",
    flag: "fr",
    isDefault: false,
  },
];

test("getLocalizedField forwards includeLegacySuffixFields to resolveContentField", () => {
  const value = getLocalizedField(
    { titleFr: "Titre français" },
    "title",
    "fr",
    { enabledLocales: LOCALES, includeLegacySuffixFields: true },
  );
  assert.equal(value, "Titre français");
});
