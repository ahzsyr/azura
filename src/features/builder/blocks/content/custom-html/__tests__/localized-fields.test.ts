import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  copyPrefixedFields,
  localizedFieldKey,
  patchLocalizedField,
  pickOtherLocaleFields,
  pickSuffixedFields,
  readLocalizedField,
  readLocalizedFieldForEdit,
} from "../lib/localized-fields";

describe("localizedFieldKey", () => {
  it("uses En suffix for English", () => {
    assert.equal(localizedFieldKey("text", "en"), "textEn");
    assert.equal(localizedFieldKey("alt", "ar"), "altAr");
  });
});

describe("readLocalizedField", () => {
  it("prefers the locale-specific value and falls back to the base", () => {
    const rec = { text: "Default", textEn: "English", textAr: "عربي" };
    assert.equal(readLocalizedField(rec, "text", "en"), "English");
    assert.equal(readLocalizedField(rec, "text", "ar"), "عربي");
    assert.equal(readLocalizedField({ text: "Default" }, "text", "ar"), "Default");
  });

  it("reads attribute locale keys", () => {
    const attrs = { alt: "Cat", altAr: "قطة" };
    assert.equal(readLocalizedField(attrs, "alt", "ar"), "قطة");
    assert.equal(readLocalizedField(attrs, "alt", "en"), "Cat");
  });
});

describe("readLocalizedFieldForEdit", () => {
  it("does not fall back for non-default locales", () => {
    const rec = { text: "Default", textEn: "English" };
    assert.equal(readLocalizedFieldForEdit(rec, "text", "en", "en"), "English");
    assert.equal(readLocalizedFieldForEdit(rec, "text", "ar", "en"), "");
  });
});

describe("patchLocalizedField", () => {
  it("dual-writes the base key for the default locale", () => {
    assert.deepEqual(patchLocalizedField("text", "Hello", "en", "en"), {
      text: "Hello",
      textEn: "Hello",
    });
    assert.deepEqual(patchLocalizedField("text", "مرحبا", "ar", "en"), {
      textAr: "مرحبا",
    });
  });
});

describe("copyPrefixedFields", () => {
  it("maps label locale keys onto text keys", () => {
    const copied = copyPrefixedFields(
      { label: "Name", labelEn: "Name", labelAr: "اسم", width: "20%" },
      "label",
      "text"
    );
    assert.equal(copied.text, "Name");
    assert.equal(copied.textEn, "Name");
    assert.equal(copied.textAr, "اسم");
    assert.equal(copied.width, undefined);
  });
});

describe("pickSuffixedFields / pickOtherLocaleFields", () => {
  it("keeps sibling locale keys when replacing the active locale", () => {
    const rec = { text: "Hi", textEn: "Hi", textAr: "مرحبا", titleEn: "T" };
    const other = pickOtherLocaleFields(rec, "en");
    assert.equal(other.textAr, "مرحبا");
    assert.equal(other.textEn, undefined);
    assert.equal(other.titleEn, undefined);

    const suffixed = pickSuffixedFields(rec);
    assert.equal(suffixed.textEn, "Hi");
    assert.equal(suffixed.textAr, "مرحبا");
    assert.equal(suffixed.text, undefined);
  });
});
