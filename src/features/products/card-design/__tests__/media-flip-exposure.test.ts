import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { resolveMediaFlipBackExposed } from "@/features/products/card-design/media-flip-exposure";

describe("resolveMediaFlipBackExposed", () => {
  it("is false when neither flipped nor hovered", () => {
    assert.equal(resolveMediaFlipBackExposed(false, false), false);
  });

  it("is true when flipped", () => {
    assert.equal(resolveMediaFlipBackExposed(true, false), true);
  });

  it("is true when hovered", () => {
    assert.equal(resolveMediaFlipBackExposed(false, true), true);
  });

  it("is true when both flipped and hovered", () => {
    assert.equal(resolveMediaFlipBackExposed(true, true), true);
  });
});
