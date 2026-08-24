import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { BLOCK_DEFAULTS } from "@/schemas/builder";
import {
  tabbedShowcasePropsSchema,
  tabbedShowcaseTabSchema,
  tabbedShowcaseVisualSchema,
  visualLayerSchema,
  frameSequenceSchema,
} from "@/features/builder/blocks/marketing/schemas/marketing-blocks";

describe("tabbedShowcase block schemas", () => {
  it("parses tabbedShowcase defaults from BLOCK_DEFAULTS", () => {
    const parsed = tabbedShowcasePropsSchema.parse(BLOCK_DEFAULTS.tabbedShowcase);
    assert.equal(parsed.showNavArrows, true);
    assert.equal(parsed.tabs.length, 1);
    assert.equal(parsed.tabs[0]?.features.length, 2);
  });

  it("parses nested tab visual structure", () => {
    const parsed = tabbedShowcaseTabSchema.parse({
      id: "tab-1",
      label: "Tab 1",
      title: "Title",
      features: [{ id: "f1", icon: "check", description: "Point one" }],
      visual: {
        stageAspectRatio: "980/780",
        layers: [
          {
            id: "layer-1",
            imageUrl: "/layer.png",
            mediaAssetId: "",
            x: 10,
            y: 20,
            opacity: 0.8,
            zIndex: 1,
            scale: 1,
          },
        ],
        sequences: [
          {
            id: "seq-1",
            frames: [{ id: "frame-1", imageUrl: "/frame-1.png", mediaAssetId: "" }],
            x: 50,
            y: 50,
            zIndex: 10,
            fps: 12,
            loop: true,
          },
        ],
      },
    });

    assert.equal(parsed.visual.layers.length, 1);
    assert.equal(parsed.visual.sequences.length, 1);
    assert.equal(parsed.visual.sequences[0]?.frames.length, 1);
  });

  it("applies visual layer defaults", () => {
    const parsed = visualLayerSchema.parse({ id: "layer-1", imageUrl: "/x.png" });
    assert.equal(parsed.x, 0);
    assert.equal(parsed.y, 0);
    assert.equal(parsed.opacity, 1);
    assert.equal(parsed.zIndex, 0);
    assert.equal(parsed.scale, 1);
    assert.equal(parsed.animation.type, "fade");
    assert.equal(parsed.animation.durationMs, 600);
    assert.equal(parsed.animation.delayMs, 0);
  });

  it("applies frame sequence defaults", () => {
    const parsed = frameSequenceSchema.parse({ id: "seq-1", frames: [] });
    assert.equal(parsed.fps, 12);
    assert.equal(parsed.loop, true);
    assert.equal(parsed.zIndex, 10);
    assert.equal(parsed.animation.type, "fade");
  });

  it("parses custom layer animation settings", () => {
    const parsed = visualLayerSchema.parse({
      id: "layer-1",
      imageUrl: "/x.png",
      animation: {
        type: "fadeSlideUp",
        durationMs: 800,
        delayMs: 150,
        distance: 40,
        fromScale: 0.8,
        easing: "easeInOut",
      },
    });
    assert.equal(parsed.animation.type, "fadeSlideUp");
    assert.equal(parsed.animation.durationMs, 800);
    assert.equal(parsed.animation.delayMs, 150);
    assert.equal(parsed.animation.distance, 40);
    assert.equal(parsed.animation.fromScale, 0.8);
    assert.equal(parsed.animation.easing, "easeInOut");
  });

  it("parses visual defaults", () => {
    const parsed = tabbedShowcaseVisualSchema.parse({});
    assert.equal(parsed.stageAspectRatio, "980/780");
    assert.deepEqual(parsed.layers, []);
    assert.deepEqual(parsed.sequences, []);
  });
});
