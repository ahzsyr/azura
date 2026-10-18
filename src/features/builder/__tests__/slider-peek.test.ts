import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { peekBasis, peekCountAttr, responsivePeekBasis, sliderPeekOpts } from "@/features/builder/slider-peek";

describe("slider peek", () => {
  it("sizes a slide as n plus a 0.2 peek", () => {
    assert.equal(peekBasis(1), "basis-[calc(100%/1.2)]");
    assert.equal(peekBasis(3, "lg"), "lg:basis-[calc(100%/3.2)]");
    assert.equal(peekBasis(4, "sm"), "sm:basis-[calc(100%/4.2)]");
  });

  it("keeps the previous responsive steps", () => {
    assert.equal(responsivePeekBasis(1), "basis-[calc(100%/1.2)]");
    assert.equal(responsivePeekBasis(2), "basis-[calc(100%/1.2)] sm:basis-[calc(100%/2.2)]");
    assert.equal(
      responsivePeekBasis(3),
      "basis-[calc(100%/1.2)] sm:basis-[calc(100%/2.2)] lg:basis-[calc(100%/3.2)]",
    );
    assert.equal(
      responsivePeekBasis(4),
      "basis-[calc(100%/1.2)] sm:basis-[calc(100%/2.2)] lg:basis-[calc(100%/4.2)]",
    );
  });

  it("does not loop so the last card can show the previous peek", () => {
    assert.equal(sliderPeekOpts.loop, false);
    assert.equal(sliderPeekOpts.containScroll, "trimSnaps");
    assert.equal(peekCountAttr(4), "4");
  });
});
