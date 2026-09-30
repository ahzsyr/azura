import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  CONTENT_POSITION_PLACE_CLASS,
  MEDIA_ASPECT_CLASS,
  MEDIA_GAP_CLASS,
  MEDIA_SIZE_CLASS,
  MEDIA_WIDTH_CLASS,
  contentAreaAlignClasses,
  normalizeImageBlockSettings,
  resolveCustomDimensionStyle,
  sideBySideLayoutClasses,
  shouldRenderImageBlock,
} from "@/features/builder/blocks/content/lib/image-block-model";

describe("normalizeImageBlockSettings", () => {
  it("applies defaults for missing settings (legacy block)", () => {
    const model = normalizeImageBlockSettings({
      url: "/media/photo.jpg",
      title: "Hello",
    });
    assert.equal(model.layout.mediaPosition, "top");
    assert.equal(model.layout.mobileLayout, "stack");
    assert.equal(model.layout.mediaWidth, "1/2");
    assert.equal(model.layout.contentPosition, "center");
    assert.equal(model.layout.mediaGap, "lg");
    assert.equal(model.content.type, "structured");
    assert.equal(model.panel.enabled, false);
    assert.equal(model.panel.variant, "none");
    assert.equal(model.content.hasContent, true);
    assert.equal(model.isHugMode, false);
    assert.equal(model.omitHeights, true);
  });

  it("falls back to legacy imageUrl", () => {
    const model = normalizeImageBlockSettings({ imageUrl: "https://cdn.example/a.jpg" });
    assert.equal(model.media.url, "https://cdn.example/a.jpg");
    assert.equal(model.isMediaOnly, true);
    assert.equal(model.isHugMode, true);
  });

  it("normalizes invalid enum values", () => {
    const model = normalizeImageBlockSettings({
      mediaPosition: "diagonal",
      mediaGap: "huge",
      contentType: "markdown",
      contentPosition: "middle",
    });
    assert.equal(model.layout.mediaPosition, "top");
    assert.equal(model.layout.mediaGap, "lg");
    assert.equal(model.content.type, "structured");
    assert.equal(model.layout.contentPosition, "center");
  });

  it("detects image-only hug mode", () => {
    const model = normalizeImageBlockSettings({ url: "/x.jpg" });
    assert.equal(model.isMediaOnly, true);
    assert.equal(model.isContentOnly, false);
    assert.equal(model.isHugMode, true);
    assert.equal(model.content.hasContent, false);
  });

  it("detects content-only structured", () => {
    const model = normalizeImageBlockSettings({ title: "Only title" });
    assert.equal(model.isContentOnly, true);
    assert.equal(model.isMediaOnly, false);
    assert.equal(model.isHugMode, false);
    assert.equal(shouldRenderImageBlock(model), true);
  });

  it("returns not renderable when empty", () => {
    const model = normalizeImageBlockSettings({});
    assert.equal(shouldRenderImageBlock(model), false);
  });

  it("detects structured content from badge/subtitle/description without title", () => {
    const model = normalizeImageBlockSettings({
      url: "/a.jpg",
      description: "Caption",
      contentType: "structured",
    });
    assert.equal(model.content.hasContent, true);
    assert.equal(model.isHugMode, false);
  });

  it("detects richText content from richHtml", () => {
    const model = normalizeImageBlockSettings({
      contentType: "richText",
      richHtmlEn: "<p>Hello</p>",
    });
    assert.equal(model.content.hasContent, true);
    assert.equal(model.content.type, "richText");
  });

  it("ignores empty richText docs for hug detection", () => {
    const model = normalizeImageBlockSettings({
      url: "/a.jpg",
      contentType: "richText",
      richContentEn: JSON.stringify({ type: "doc", content: [{ type: "paragraph" }] }),
      richHtmlEn: "<p></p>",
    });
    assert.equal(model.content.hasContent, false);
    assert.equal(model.isHugMode, true);
  });

  it("detects html content from htmlElements", () => {
    const model = normalizeImageBlockSettings({
      contentType: "html",
      htmlElements: [{ id: "1", tag: "p", textEn: "Hi" }],
    });
    assert.equal(model.content.hasContent, true);
  });

  it("allows Style minHeight for background + content", () => {
    const model = normalizeImageBlockSettings({
      url: "/bg.jpg",
      title: "Over",
      mediaPosition: "background",
    });
    assert.equal(model.omitHeights, false);
    assert.equal(model.panel.enabled, false);
  });

  it("enables panel only for overlay/background when flagged", () => {
    const overlay = normalizeImageBlockSettings({
      mediaPosition: "overlay",
      contentPanelEnabled: true,
      contentPanelVariant: "glass",
      title: "X",
    });
    assert.equal(overlay.panel.enabled, true);
    assert.equal(overlay.panel.variant, "glass");

    const top = normalizeImageBlockSettings({
      mediaPosition: "top",
      contentPanelEnabled: true,
      title: "X",
    });
    assert.equal(top.panel.enabled, false);
  });

  it("preserves mediaAssetId", () => {
    const model = normalizeImageBlockSettings({
      url: "/a.jpg",
      mediaAssetId: "cmq56fhnv0000150467cng4pm",
    });
    assert.equal(model.media.mediaAssetId, "cmq56fhnv0000150467cng4pm");
  });

  it("defaults media aspect, size, objectFit, and headerEnabled", () => {
    const model = normalizeImageBlockSettings({ url: "/a.jpg" });
    assert.equal(model.media.aspectRatio, "auto");
    assert.equal(model.media.size, "auto");
    assert.equal(model.media.objectFit, "cover");
    assert.equal(model.header.enabled, true);
    assert.equal(model.header.visible, false);
  });

  it("shows block header when enabled with title", () => {
    const model = normalizeImageBlockSettings({
      url: "/a.jpg",
      title: "Section",
      headerEnabled: true,
    });
    assert.equal(model.header.visible, true);
    assert.equal(model.content.hasBodyContent, false);
    assert.equal(model.content.hasContent, true);
    assert.equal(model.isHugMode, false);
  });

  it("hides block header when headerEnabled is false", () => {
    const model = normalizeImageBlockSettings({
      title: "Inline",
      description: "Body",
      headerEnabled: false,
    });
    assert.equal(model.header.visible, false);
    assert.equal(model.content.hasBodyContent, true);
  });

  it("accepts aspect ratio and media size enums", () => {
    const model = normalizeImageBlockSettings({
      url: "/a.jpg",
      mediaAspectRatio: "16/9",
      mediaSize: "lg",
      mediaObjectFit: "contain",
    });
    assert.equal(model.media.aspectRatio, "16/9");
    assert.equal(model.media.size, "lg");
    assert.equal(model.media.objectFit, "contain");
    assert.equal(MEDIA_ASPECT_CLASS["16/9"].includes("aspect"), true);
    assert.equal(MEDIA_SIZE_CLASS.lg, "max-w-lg");
  });

  it("supports explicit width and height controls with aspect-ratio preservation", () => {
    const model = normalizeImageBlockSettings({
      url: "/a.jpg",
      mediaWidth: 640,
      mediaHeight: 360,
      mediaWidthAuto: false,
      mediaHeightAuto: false,
      mediaAspectRatio: "16/9",
    });
    assert.equal(model.media.width, 640);
    assert.equal(model.media.height, 360);
    assert.equal(model.media.widthAuto, false);
    assert.equal(model.media.heightAuto, false);
    assert.equal(model.media.aspectRatio, "16/9");
  });

  it("accepts a custom media size preset and keeps it distinct from max-width presets", () => {
    const model = normalizeImageBlockSettings({
      url: "/a.jpg",
      mediaSize: "custom",
      mediaFrameWidth: 640,
      mediaFrameHeight: 360,
      mediaFrameWidthAuto: false,
      mediaFrameHeightAuto: false,
    });
    assert.equal(model.media.size, "custom");
    assert.equal(model.media.width, 640);
    assert.equal(model.media.height, 360);
    assert.equal(MEDIA_SIZE_CLASS.custom, "");
  });

  it("normalizes justify description alignment and unit-aware custom dimensions", () => {
    const model = normalizeImageBlockSettings({
      url: "/a.jpg",
      descriptionAlign: "justify",
      mediaFrameWidth: 40,
      mediaFrameHeight: 20,
      mediaFrameWidthUnit: "rem",
      mediaFrameHeightUnit: "rem",
      mediaFrameWidthAuto: false,
      mediaFrameHeightAuto: false,
    });
    assert.equal(model.content.structured.descriptionAlign, "justify");
    assert.equal(model.media.width, 40);
    assert.equal(model.media.widthUnit, "rem");
    assert.equal(model.media.heightUnit, "rem");
  });

  it("derives the matching side in the same unit when aspect ratio is active", () => {
    const computed = resolveCustomDimensionStyle({
      width: 40,
      height: 100,
      widthUnit: "px",
      heightUnit: "px",
      widthAuto: false,
      heightAuto: true,
      aspectRatio: "16/9",
    });
    assert.equal(computed.width, "40px");
    assert.equal(computed.height, "22.5px");
  });
});

describe("image block layout class maps", () => {
  it("maps mediaGap / mediaWidth / contentPosition", () => {
    assert.equal(MEDIA_GAP_CLASS.lg.includes("gap"), true);
    assert.equal(MEDIA_WIDTH_CLASS["2/5"].includes("40%"), true);
    assert.equal(CONTENT_POSITION_PLACE_CLASS.center.includes("col-start-2"), true);
    assert.equal(contentAreaAlignClasses("center-left").text, "text-left");
  });

  it("maps side-by-side mobile layouts", () => {
    assert.equal(sideBySideLayoutClasses("left", "stack"), "flex flex-col md:flex-row");
    assert.equal(sideBySideLayoutClasses("left", "reverse"), "flex flex-col-reverse md:flex-row");
    assert.equal(sideBySideLayoutClasses("left", "side-by-side"), "flex flex-row");
    // Right must NOT use row-reverse (that cancelled DOM order and mirrored Left).
    assert.equal(sideBySideLayoutClasses("right", "stack"), "flex flex-col-reverse md:flex-row");
    assert.equal(sideBySideLayoutClasses("right", "reverse"), "flex flex-col md:flex-row");
    assert.equal(sideBySideLayoutClasses("right", "side-by-side"), "flex flex-row");
    assert.equal(sideBySideLayoutClasses("right", "stack").includes("row-reverse"), false);
  });
});
