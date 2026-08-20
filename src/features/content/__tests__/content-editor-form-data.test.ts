import test from "node:test";
import assert from "node:assert/strict";
import type { EntityTranslation } from "@prisma/client";
import type { PublicLocale } from "@/i18n/locale-config";
import { getLocalizedFormFieldName } from "@/features/translation/form-field-names";
import { parseFormTranslations } from "@/features/translation/form-fields";
import {
  buildContentItemLocaleFields,
  CONTENT_ITEM_CORE_LOCALE_FIELDS,
  getLocalizedAttributeStorageKey,
  readContentItemLocaleFieldsFromForm,
} from "@/features/content/admin/content-editor-form-data";
import { buildAttributesFromForm } from "@/features/content/attributes-helper";
import type { ContentFieldDefinition } from "@/features/content/types";

const locales: PublicLocale[] = [
  {
    code: "en",
    urlPrefix: "en",
    label: "English",
    htmlLang: "en",
    dir: "ltr",
    flag: "🇺🇸",
    isDefault: true,
  },
  {
    code: "ar",
    urlPrefix: "ar",
    label: "Arabic",
    htmlLang: "ar",
    dir: "rtl",
    flag: "🇦🇪",
    isDefault: false,
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
];

function translation(
  field: string,
  localeCode: string,
  value: string,
): Pick<EntityTranslation, "field" | "localeCode" | "value"> {
  return { field, localeCode, value };
}

test("buildContentItemLocaleFields seeds all locales from translations", () => {
  const fields = buildContentItemLocaleFields(
    [
      translation("title", "en", "Hello"),
      translation("title", "ar", "مرحبا"),
      translation("title", "fr", "Bonjour"),
      translation("subtitle", "en", "Sub"),
    ],
    locales,
  );

  assert.equal(fields.title?.en, "Hello");
  assert.equal(fields.title?.ar, "مرحبا");
  assert.equal(fields.title?.fr, "Bonjour");
  assert.equal(fields.subtitle?.en, "Sub");
  assert.equal(fields.subtitle?.ar, "");
  assert.ok(CONTENT_ITEM_CORE_LOCALE_FIELDS.includes("title"));
  assert.ok(!CONTENT_ITEM_CORE_LOCALE_FIELDS.includes("seoTitle"));
});

test("hidden field names match parseFormTranslations for every locale", () => {
  const localeFields = buildContentItemLocaleFields(
    [
      translation("title", "en", "Hello"),
      translation("title", "ar", "مرحبا"),
      translation("title", "fr", "Bonjour"),
    ],
    locales,
    ["title"],
  );

  const formData = new FormData();
  for (const locale of locales) {
    const name = getLocalizedFormFieldName("title", locale.code);
    formData.set(name, localeFields.title?.[locale.code] ?? "");
  }

  assert.equal(getLocalizedFormFieldName("title", "en"), "titleEn");
  assert.equal(getLocalizedFormFieldName("title", "ar"), "titleAr");
  assert.equal(getLocalizedFormFieldName("title", "fr"), "title_fr");

  const parsed = parseFormTranslations(formData, "ContentItem", "item-1", locales, ["title"]);
  assert.deepEqual(
    parsed.map((row) => [row.localeCode, row.value]),
    [
      ["en", "Hello"],
      ["ar", "مرحبا"],
      ["fr", "Bonjour"],
    ],
  );
});

test("readContentItemLocaleFieldsFromForm captures Details-tab translations", () => {
  const formData = new FormData();
  formData.set(getLocalizedFormFieldName("title", "ar"), "مرحبا");
  formData.set(getLocalizedFormFieldName("subtitle", "ar"), "عنوان فرعي");
  formData.set(getLocalizedFormFieldName("description", "ar"), "وصف");

  const fields = readContentItemLocaleFieldsFromForm(formData, locales);
  assert.equal(fields.title?.ar, "مرحبا");
  assert.equal(fields.subtitle?.ar, "عنوان فرعي");
  assert.equal(fields.description?.ar, "وصف");
  assert.equal(fields.title?.en, "");
});

test("buildAttributesFromForm persists localized schema fields for 3+ locales", () => {
  const fields: ContentFieldDefinition[] = [
    { key: "tagline", type: "text", labelEn: "Tagline", localized: true },
    { key: "year", type: "number", labelEn: "Year" },
  ];
  const formData = new FormData();
  formData.set(getLocalizedFormFieldName("tagline", "en"), "Fast");
  formData.set(getLocalizedFormFieldName("tagline", "ar"), "سريع");
  formData.set(getLocalizedFormFieldName("tagline", "fr"), "Rapide");
  formData.set("year", "2024");

  const attrs = buildAttributesFromForm(formData, fields, locales);
  assert.equal(attrs[getLocalizedAttributeStorageKey("tagline", "en")], "Fast");
  assert.equal(attrs[getLocalizedAttributeStorageKey("tagline", "ar")], "سريع");
  assert.equal(attrs[getLocalizedAttributeStorageKey("tagline", "fr")], "Rapide");
  assert.equal(attrs.year, 2024);
});
