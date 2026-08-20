import test from "node:test";
import assert from "node:assert/strict";
import {
  readLegacyFieldForLocale,
  resolveAdminFieldValue,
} from "@/features/translation/admin-field-value";

test("readLegacyFieldForLocale reads camel suffix for all locales", () => {
  const entity = { titleEn: "English", titleFr: "Français", titleId: "Indonesia" };
  assert.equal(readLegacyFieldForLocale(entity, "title", "fr"), "Français");
  assert.equal(readLegacyFieldForLocale(entity, "title", "id"), "Indonesia");
});

test("readLegacyFieldForLocale reads underscore suffix for legacy data", () => {
  const entity = { title_fr: "Français", title_id: "Indonesia" };
  assert.equal(readLegacyFieldForLocale(entity, "title", "fr"), "Français");
  assert.equal(readLegacyFieldForLocale(entity, "title", "id"), "Indonesia");
});

test("readLegacyFieldForLocale prefers camel suffix over underscore", () => {
  const entity = { titleFr: "Camel", title_fr: "Underscore" };
  assert.equal(readLegacyFieldForLocale(entity, "title", "fr"), "Camel");
});

test("resolveAdminFieldValue reads underscore legacy keys for non-default locales", () => {
  const values = {};
  const entity = { message_en: "Hello", message_id: "Halo" };
  assert.equal(resolveAdminFieldValue(values, entity, "message", "id", "en"), "Halo");
});

test("resolveAdminFieldValue prefers explicit dual-write clear over EntityTranslation values", () => {
  const values = { en: { value: "BC", status: "PUBLISHED" as const } };
  const entity = { formSectionTitle: "", formSectionTitleEn: "" };
  assert.equal(resolveAdminFieldValue(values, entity, "formSectionTitle", "en", "en"), "");
});

test("resolveAdminFieldValue prefers empty unsuffixed default-locale field over EntityTranslation", () => {
  const values = { en: { value: "Products", status: "PUBLISHED" as const } };
  const entity = { label: "" };
  assert.equal(resolveAdminFieldValue(values, entity, "label", "en", "en"), "");
});

test("resolveAdminFieldValue can ignore empty unsuffixed defaults for builder blocks", () => {
  const values = { en: { value: "Hello from ET", status: "PUBLISHED" as const } };
  const entity = { content: "", title: "", subtitle: "", badge: "" };
  assert.equal(
    resolveAdminFieldValue(values, entity, "content", "en", "en", {
      treatEmptyUnsuffixedAsClear: false,
    }),
    "Hello from ET",
  );
});

test("resolveAdminFieldValue bootstraps contentEn when unsuffixed default is empty", () => {
  const values = {};
  const entity = { content: "", contentEn: "Legacy paragraph" };
  assert.equal(
    resolveAdminFieldValue(values, entity, "content", "en", "en", {
      treatEmptyUnsuffixedAsClear: false,
    }),
    "Legacy paragraph",
  );
});

test("resolveAdminFieldValue still honors explicit dual-write clears for builder blocks", () => {
  const values = { en: { value: "Stale", status: "PUBLISHED" as const } };
  const entity = { content: "", contentEn: "" };
  assert.equal(
    resolveAdminFieldValue(values, entity, "content", "en", "en", {
      treatEmptyUnsuffixedAsClear: false,
    }),
    "",
  );
});

test("resolveAdminFieldValue bootstraps unsuffixed default-locale field when no translation", () => {
  const values = {};
  const entity = { label: "Products" };
  assert.equal(resolveAdminFieldValue(values, entity, "label", "en", "en"), "Products");
});

test("resolveAdminFieldValue prefers non-empty legacy default over EntityTranslation", () => {
  const values = { en: { value: "Solutions", status: "PUBLISHED" as const } };
  const entity = { label: "Mikrotik" };
  assert.equal(resolveAdminFieldValue(values, entity, "label", "en", "en"), "Mikrotik");
});
