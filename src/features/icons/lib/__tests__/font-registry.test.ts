import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { glyphFromUnicode } from "../font-registry";

describe("font icon glyph resolution", () => {
  it("resolves unicode hex to character", () => {
    assert.equal(glyphFromUnicode("e88a"), "\u{e88a}");
  });

  it("falls back to glyph name", () => {
    assert.equal(glyphFromUnicode(undefined, "home"), "home");
  });
});
