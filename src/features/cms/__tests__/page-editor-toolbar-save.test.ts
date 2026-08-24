import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { runPageEditorToolbarSave } from "@/features/cms/lib/page-editor-toolbar-save";

describe("runPageEditorToolbarSave", () => {
  it("uses full save for existing pages (includes blockTranslations in payload)", async () => {
    let saveCalled = false;
    const formData = new FormData();
    formData.set("id", "page-1");
    formData.set("blockTranslations", JSON.stringify([]));
    formData.set("titleAr", "عنوان");

    const result = await runPageEditorToolbarSave(formData, async (fd) => {
      saveCalled = true;
      assert.equal(fd.get("id"), "page-1");
      assert.equal(fd.get("blockTranslations"), "[]");
      assert.equal(fd.get("titleAr"), "عنوان");
      return { ok: true, redirectTo: "/admin/pages/page-1?tab=content" };
    });

    assert.ok(saveCalled);
    assert.equal(result.ok, true);
    if (result.ok) {
      assert.equal(result.redirectTo, "/admin/pages/page-1?tab=content");
    }
  });
});
