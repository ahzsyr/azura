import test from "node:test";
import assert from "node:assert/strict";
import { resolveContentField } from "@/features/translation/resolve-content-field";
import { resolveTranslation } from "@/features/translation/translation-resolver";
import type { EntityTranslation } from "@prisma/client";
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
    code: "id",
    urlPrefix: "id",
    label: "Indonesian",
    htmlLang: "id",
    dir: "ltr",
    flag: "id",
    isDefault: false,
  },
];

function row(field: string, localeCode: string, value: string): EntityTranslation {
  return {
    id: `${field}:${localeCode}`,
    entityType: "CmsPage",
    entityId: "page-1",
    field,
    localeCode,
    value,
    status: "PUBLISHED",
    version: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

test("resolveContentField returns translated value for locale", () => {
  const value = resolveContentField(
    { title: "English base" },
    "title",
    "id",
    {
      enabledLocales: LOCALES,
      defaultCode: "en",
      translations: [row("title", "id", "Judul")],
      includeLegacySuffixFields: true,
    },
  );
  assert.equal(value, "Judul");
});

test("resolveContentField falls back only to default locale", () => {
  const value = resolveContentField(
    { title: "English base" },
    "title",
    "fr",
    {
      enabledLocales: LOCALES,
      defaultCode: "en",
      translations: [
        row("title", "en", "English from translation"),
        row("title", "id", "Judul"),
      ],
    },
  );
  assert.equal(value, "English from translation");
});

test("resolveContentField can read legacy suffixed fields", () => {
  const value = resolveContentField(
    { titleEn: "Legacy English", titleId: "Legacy Indonesian" },
    "title",
    "id",
    {
      enabledLocales: LOCALES,
      defaultCode: "en",
      includeLegacySuffixFields: true,
    },
  );
  assert.equal(value, "Legacy Indonesian");
});

test("resolveContentField reads underscore legacy keys for non-En/Ar locales", () => {
  const value = resolveContentField(
    { title_en: "Legacy English", title_id: "Judul Indonesia" },
    "title",
    "id",
    {
      enabledLocales: LOCALES,
      defaultCode: "en",
      includeLegacySuffixFields: true,
    },
  );
  assert.equal(value, "Judul Indonesia");
});

test("resolveTranslation returns direct locale before enabled-locale fallback chain", () => {
  const value = resolveTranslation("title", "id", {
    translations: [row("title", "id", "Judul")],
    enabledLocales: LOCALES,
    defaultCode: "en",
  });
  assert.equal(value, "Judul");
});

test("resolveContentField reads suffixed item fields for requested locale without enabled locale list", () => {
  const value = resolveContentField(
    { titleEn: "English", titleId: "Indonesia" },
    "title",
    "id",
    {
      enabledLocales: LOCALES.filter((locale) => locale.code === "en"),
      defaultCode: "en",
      includeLegacySuffixFields: true,
    },
  );
  assert.equal(value, "Indonesia");
});

test("resolveContentField ignores legacy suffixed fields unless explicitly enabled", () => {
  const value = resolveContentField(
    { titleEn: "Legacy English", titleId: "Legacy Indonesian" },
    "title",
    "id",
    {
      enabledLocales: LOCALES,
      defaultCode: "en",
    },
  );
  assert.equal(value, "");
});

