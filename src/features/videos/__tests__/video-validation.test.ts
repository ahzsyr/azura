import assert from "node:assert/strict";
import test from "node:test";
import {
  isJpgOrPngThumbnail,
  isSvgThumbnail,
  isVideoPublishReady,
} from "../video-validation";

test("isJpgOrPngThumbnail accepts jpeg/png mime and extensions", () => {
  assert.equal(isJpgOrPngThumbnail("image/jpeg", null), true);
  assert.equal(isJpgOrPngThumbnail("image/png", "/uploads/a.png"), true);
  assert.equal(isJpgOrPngThumbnail(null, "/media/thumb.jpg"), true);
  assert.equal(isJpgOrPngThumbnail(null, "/media/thumb.JPEG"), true);
});

test("isJpgOrPngThumbnail rejects SVG and other types", () => {
  assert.equal(isJpgOrPngThumbnail("image/svg+xml", null), false);
  assert.equal(isJpgOrPngThumbnail("image/jpeg", "/x.svg"), false);
  assert.equal(isJpgOrPngThumbnail(null, "/poster.webp"), false);
  assert.equal(isJpgOrPngThumbnail("image/gif", "/a.gif"), false);
  assert.equal(isSvgThumbnail("image/svg+xml"), true);
  assert.equal(isSvgThumbnail("/icon.svg"), true);
});

test("isVideoPublishReady requires video content and JPG/PNG thumb", () => {
  assert.equal(
    isVideoPublishReady({
      title: "Show",
      description: "Desc",
      contentMedia: { url: "/v.mp4", mimeType: "video/mp4", mediaType: "VIDEO" },
      thumbnailMedia: { url: "/t.jpg", mimeType: "image/jpeg", mediaType: "IMAGE" },
    }),
    true,
  );
  assert.equal(
    isVideoPublishReady({
      title: "Show",
      description: "Desc",
      contentMedia: { url: "/v.mp4", mimeType: "video/mp4", mediaType: "VIDEO" },
      thumbnailMedia: { url: "/t.svg", mimeType: "image/svg+xml", mediaType: "SVG" },
    }),
    false,
  );
  assert.equal(
    isVideoPublishReady({
      title: "",
      description: "Desc",
      contentMedia: { url: "/v.mp4", mediaType: "VIDEO" },
      thumbnailMedia: { url: "/t.png", mimeType: "image/png" },
    }),
    false,
  );
});
