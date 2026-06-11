import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { __test__ } from "@/features/translation/components/localized-block-field";

describe("LocalizedBlockField display resolution", () => {
  it("falls back to legacy props when translation value is empty", () => {
    const value = __test__.resolveDisplayValue(
      { en: { value: "" } },
      { contentEn: "Legacy English", contentAr: "Legacy Arabic" },
      "content",
      "en"
    );
    assert.equal(value, "Legacy English");
  });

  it("prefers non-empty translation over legacy props", () => {
    const value = __test__.resolveDisplayValue(
      { en: { value: "Translated" } },
      { contentEn: "Legacy English" },
      "content",
      "en"
    );
    assert.equal(value, "Translated");
  });
});
