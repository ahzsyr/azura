import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  getTextContentAlignClass,
  normalizeTextContentAlignment,
} from "@/features/builder/blocks/content/lib/text-content-alignment";

describe("text content alignment", () => {
  it("normalizes left/right/center/justify while honoring logical direction", () => {
    assert.equal(normalizeTextContentAlignment("left"), "left");
    assert.equal(normalizeTextContentAlignment("right"), "right");
    assert.equal(normalizeTextContentAlignment("center"), "center");
    assert.equal(normalizeTextContentAlignment("justify"), "justify");
    assert.equal(normalizeTextContentAlignment("start"), "left");
    assert.equal(normalizeTextContentAlignment("end"), "right");
    assert.equal(normalizeTextContentAlignment(undefined), "left");
  });

  it("maps logical alignment to CSS classes that respect LTR/RTL", () => {
    assert.equal(getTextContentAlignClass("left"), "text-start");
    assert.equal(getTextContentAlignClass("right"), "text-end");
    assert.equal(getTextContentAlignClass("center"), "text-center");
    assert.equal(getTextContentAlignClass("justify"), "text-justify");
    assert.equal(getTextContentAlignClass("start"), "text-start");
    assert.equal(getTextContentAlignClass("end"), "text-end");
    assert.equal(getTextContentAlignClass(undefined), "text-start");
  });
});
