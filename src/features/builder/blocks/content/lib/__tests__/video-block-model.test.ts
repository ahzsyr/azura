import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { normalizeVideoBlockSettings } from "@/features/builder/blocks/content/lib/video-block-model";
import { buildEmbedPlaybackSrc, parseEmbedUrl } from "@/features/builder/blocks/media/lib/embed-video";

describe("normalizeVideoBlockSettings", () => {
  it("maps legacy caption to description and defaults aspect to 16/9", () => {
    const model = normalizeVideoBlockSettings({
      url: "https://www.youtube.com/watch?v=abc123XYZ_",
      title: "Watch",
      caption: "Legacy caption",
    });
    assert.equal(model.media.url.includes("youtube"), true);
    assert.equal(model.content.structured.description, "Legacy caption");
    assert.equal(model.media.aspectRatio, "16/9");
    assert.equal(model.header.visible, true);
    assert.equal(model.isHugMode, false);
  });

  it("prefers description over caption", () => {
    const model = normalizeVideoBlockSettings({
      description: "New",
      caption: "Old",
    });
    assert.equal(model.content.structured.description, "New");
  });

  it("video-only hugs", () => {
    const model = normalizeVideoBlockSettings({ url: "/uploads/clip.mp4" });
    assert.equal(model.isHugMode, true);
    assert.equal(model.isMediaOnly, true);
  });
});

describe("embed video playback src", () => {
  it("does not autoplay by default", () => {
    const info = parseEmbedUrl("https://youtu.be/abc123XYZ_");
    assert.equal(info.type, "youtube");
    const src = buildEmbedPlaybackSrc(info, false);
    assert.equal(src?.includes("autoplay"), false);
  });

  it("adds autoplay when requested", () => {
    const info = parseEmbedUrl("https://youtu.be/abc123XYZ_");
    const src = buildEmbedPlaybackSrc(info, true);
    assert.equal(src?.includes("autoplay=1"), true);
  });
});
