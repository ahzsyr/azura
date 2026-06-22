import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  STAGGER_MAX_MS,
  STAGGER_STEP_MS,
  staggerDelayForIndex,
} from "@/lib/motion/staggered-reveal";

describe("staggered-reveal", () => {
  it("computes astro stagger delays by sibling index", () => {
    assert.equal(staggerDelayForIndex(0), undefined);
    assert.equal(staggerDelayForIndex(1), STAGGER_STEP_MS);
    assert.equal(staggerDelayForIndex(2), STAGGER_STEP_MS * 2);
    assert.equal(staggerDelayForIndex(10), STAGGER_MAX_MS);
  });
});
