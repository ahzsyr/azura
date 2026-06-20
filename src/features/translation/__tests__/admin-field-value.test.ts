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
