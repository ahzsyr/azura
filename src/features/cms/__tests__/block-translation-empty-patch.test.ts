import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { hasBlockTranslationEdits } from "@/features/cms/lib/page-editor-form-data";

describe("hasBlockTranslationEdits", () => {
  it("treats empty clears payload as pending translation edits", () => {
    const raw = JSON.stringify([
      {
        entityType: "BuilderBlock",
        entityId: "abc",
        field: "heroTitle",
        localeCode: "en",
        value: "",
        status: "PUBLISHED",
      },
    ]);
    assert.equal(hasBlockTranslationEdits(raw), true);
  });

  it("ignores null, empty string, and empty array payloads", () => {
    assert.equal(hasBlockTranslationEdits(null), false);
    assert.equal(hasBlockTranslationEdits(""), false);
    assert.equal(hasBlockTranslationEdits("[]"), false);
  });
});
