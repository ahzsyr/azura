import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  __test__,
  emptyLocalizedItemFields,
  itemFieldPropKey,
} from "@/features/builder/blocks/marketing/admin/localized-item-fields";

describe("localized item fields", () => {
  it("builds prop keys from locale code", () => {
    assert.equal(itemFieldPropKey("title", "en"), "titleEn");
    assert.equal(itemFieldPropKey("title", "ar"), "titleAr");
    assert.equal(itemFieldPropKey("title", "fr"), "titleFr");
  });

  it("emptyLocalizedItemFields only creates default locale keys", () => {
    assert.deepEqual(emptyLocalizedItemFields(["title", "label"], "en"), {
      titleEn: "",
      labelEn: "",
    });
  });

  it("readItemFieldValue prefers locale value then English fallback", () => {
    const values = { titleEn: "Hello", titleFr: "Bonjour" };
    assert.equal(__test__.readItemFieldValue(values, "title", "fr"), "Bonjour");
    assert.equal(__test__.readItemFieldValue(values, "title", "de"), "Hello");
  });
});
