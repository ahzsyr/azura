import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { buildVisualLayerMotion } from "@/features/builder/blocks/marketing/lib/visual-layer-motion";
import { defaultVisualLayerAnimation } from "@/features/builder/blocks/marketing/schemas/marketing-blocks";

describe("visual layer motion", () => {
  it("skips motion when type is none", () => {
    const motion = buildVisualLayerMotion(defaultVisualLayerAnimation({ type: "none" }));
    assert.equal(motion.initial, false);
    assert.equal(motion.transition.duration, 0);
  });

  it("builds fade slide up initial offsets", () => {
    const motion = buildVisualLayerMotion(
      defaultVisualLayerAnimation({ type: "fadeSlideUp", distance: 40, durationMs: 500, delayMs: 100 }),
    );
    assert.notEqual(motion.initial, false);
    if (motion.initial !== false) {
      assert.equal(motion.initial.opacity, 0);
      assert.equal(motion.initial.y, 40);
    }
    assert.equal(motion.animate.opacity, 1);
    assert.equal(motion.animate.y, 0);
    assert.equal(motion.transition.duration, 0.5);
    assert.equal(motion.transition.delay, 0.1);
  });

  it("applies base opacity and scale", () => {
    const motion = buildVisualLayerMotion(
      defaultVisualLayerAnimation({ type: "fadeScale", fromScale: 0.5 }),
      { baseOpacity: 0.8, baseScale: 2 },
    );
    assert.notEqual(motion.initial, false);
    if (motion.initial !== false) {
      assert.equal(motion.initial.opacity, 0);
      assert.equal(motion.initial.scale, 1);
    }
    assert.equal(motion.animate.opacity, 0.8);
    assert.equal(motion.animate.scale, 2);
  });
});
