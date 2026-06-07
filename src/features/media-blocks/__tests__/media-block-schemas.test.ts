import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { BLOCK_DEFAULTS } from "@/schemas/builder";
import {
  interactiveHotspotsPropsSchema,
  masonryGalleryPropsSchema,
  videoGalleryPropsSchema,
  videoHeroPropsSchema,
} from "@/features/media-blocks/schemas/media-blocks";

describe("media block schemas", () => {
  it("parses videoHero defaults", () => {
    const parsed = videoHeroPropsSchema.parse(BLOCK_DEFAULTS.videoHero);
    assert.equal(parsed.mediaMode, "single");
    assert.equal(parsed.layout, "fullBleed");
  });

  it("parses videoGallery defaults", () => {
    const parsed = videoGalleryPropsSchema.parse(BLOCK_DEFAULTS.videoGallery);
    assert.equal(parsed.source, "inline");
    assert.equal(parsed.enableLightbox, true);
  });

  it("parses interactiveHotspots defaults", () => {
    const parsed = interactiveHotspotsPropsSchema.parse(BLOCK_DEFAULTS.interactiveHotspots);
    assert.equal(parsed.interaction, "click");
    assert.deepEqual(parsed.hotspots, []);
  });

  it("parses masonryGallery defaults", () => {
    const parsed = masonryGalleryPropsSchema.parse(BLOCK_DEFAULTS.masonryGallery);
    assert.equal(parsed.source, "inline");
    assert.equal(parsed.enableLightbox, true);
  });
});
