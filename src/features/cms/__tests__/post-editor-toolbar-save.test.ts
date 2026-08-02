import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { shouldPostEditorUsePatchSave } from "@/features/cms/lib/post-editor-toolbar-save";

describe("post editor toolbar save", () => {
  it("does not use patch save (regression: patch dropped blockTranslations and locale fields)", () => {
    assert.equal(shouldPostEditorUsePatchSave(), false);
  });
});
