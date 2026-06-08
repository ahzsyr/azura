import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  animationInlineStyle,
  resolveAnimationClasses,
  resolveScrollRevealAttributes,
} from "@/features/builder/animation/animation-resolver";
import type { BlockAnimationSettings } from "@/types/block-system";

const enabledFade: BlockAnimationSettings = {
  enabled: true,
  behavior: "once",
  entrance: { type: "fade", durationMs: 600 },
};

describe("animation-resolver behavior", () => {
  it("once mode uses keyframes for above-the-fold blocks only", () => {
    const heroClasses = resolveAnimationClasses(enabledFade, undefined, 0);
    assert.match(heroClasses, /block-anim-entrance/);
    assert.match(heroClasses, /block-anim-once/);
    assert.doesNotMatch(heroClasses, /block-anim-loop/);

    const belowFoldClasses = resolveAnimationClasses(enabledFade, undefined, 2);
    assert.doesNotMatch(belowFoldClasses, /block-anim-entrance/);
    assert.match(belowFoldClasses, /block-anim-once/);
  });

  it("once mode uses scroll reveal for below-the-fold blocks", () => {
    assert.deepEqual(resolveScrollRevealAttributes(enabledFade, undefined, 0), {});
    assert.deepEqual(resolveScrollRevealAttributes(enabledFade, undefined, 2), {
      "data-animation": "fade",
    });
  });

  it("once mode does not stack keyframes with scroll reveal", () => {
    const classes = resolveAnimationClasses(enabledFade, undefined, 2);
    const scroll = resolveScrollRevealAttributes(enabledFade, undefined, 2);
    assert.doesNotMatch(classes, /block-anim-entrance/);
    assert.equal(scroll["data-animation"], "fade");
  });

  it("loop mode uses keyframes and never scroll reveal", () => {
    const loop: BlockAnimationSettings = { ...enabledFade, behavior: "loop" };
    const classes = resolveAnimationClasses(loop, undefined, 2);
    assert.match(classes, /block-anim-loop/);
    assert.match(classes, /block-anim-entrance/);
    assert.deepEqual(resolveScrollRevealAttributes(loop, undefined, 2), {});
    assert.equal(animationInlineStyle(loop, 2).animationIterationCount, "infinite");
  });

  it("once mode enforces a single iteration", () => {
    assert.equal(animationInlineStyle(enabledFade, 0).animationIterationCount, 1);
  });
});
