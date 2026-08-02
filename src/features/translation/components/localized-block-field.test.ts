import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { __test__ } from "@/features/translation/components/localized-block-field";

describe("LocalizedBlockField display resolution", () => {
  it("does not fall back to legacy props for non-default locale", () => {
    const value = __test__.resolveDisplayValue(
      { en: { value: "" } },
      { contentEn: "Legacy English", contentAr: "Legacy Arabic" },
      "content",
      "fr",
      "en"
    );
    assert.equal(value, "");
  });

  it("bootstraps default locale from legacy props when translation empty", () => {
    const value = __test__.resolveDisplayValue(
      { en: { value: "" } },
      { contentEn: "Legacy English" },
      "content",
      "en",
      "en"
    );
    assert.equal(value, "Legacy English");
  });

  it("prefers non-empty translation over legacy props", () => {
    const value = __test__.resolveDisplayValue(
      { en: { value: "Translated" } },
      { contentEn: "Legacy English" },
      "content",
      "en",
      "en"
    );
    assert.equal(value, "Translated");
  });
});
