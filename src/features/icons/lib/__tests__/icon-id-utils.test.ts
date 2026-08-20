import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { looksLikeIconLibraryId } from "../icon-id-utils";

describe("looksLikeIconLibraryId", () => {
  it("detects built-in lucide ids", () => {
    assert.equal(looksLikeIconLibraryId("chevron-right"), true);
  });

  it("detects font library ids", () => {
    assert.equal(looksLikeIconLibraryId("font-material-home"), true);
  });

  it("treats legacy marketing keys as non-library", () => {
    assert.equal(looksLikeIconLibraryId("shield"), false);
  });

  it("treats custom kebab ids as library", () => {
    assert.equal(looksLikeIconLibraryId("my-brand-icon"), true);
  });
});
