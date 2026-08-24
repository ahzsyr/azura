import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  parseTextDir,
  textDirHtmlAttrs,
} from "@/features/builder/blocks/content/admin/lib/advanced-rich-text-text-direction";

describe("advanced rich text text direction", () => {
  it("parses only ltr and rtl", () => {
    assert.equal(parseTextDir("rtl"), "rtl");
    assert.equal(parseTextDir("ltr"), "ltr");
    assert.equal(parseTextDir("RTL"), "rtl");
    assert.equal(parseTextDir("auto"), null);
    assert.equal(parseTextDir(""), null);
    assert.equal(parseTextDir(null), null);
  });

  it("renders dir only when ltr or rtl is set", () => {
    assert.deepEqual(textDirHtmlAttrs("rtl"), { dir: "rtl" });
    assert.deepEqual(textDirHtmlAttrs("ltr"), { dir: "ltr" });
    assert.deepEqual(textDirHtmlAttrs(null), {});
    assert.deepEqual(textDirHtmlAttrs(undefined), {});
    assert.deepEqual(textDirHtmlAttrs("auto"), {});
  });
});
