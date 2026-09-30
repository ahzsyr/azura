import assert from "node:assert/strict";
import test from "node:test";
import {
  DEFAULT_POST_FEATURED_IMAGE_SETTINGS,
  mergePostFeaturedImageSettings,
  parsePostFeaturedImageSettings,
} from "@/schemas/featured-image-settings";
import { resolveFeaturedImageDisplay } from "@/lib/featured-image-display";

test("parsePostFeaturedImageSettings returns defaults for invalid input", () => {
  assert.deepEqual(parsePostFeaturedImageSettings(null), DEFAULT_POST_FEATURED_IMAGE_SETTINGS);
  assert.deepEqual(parsePostFeaturedImageSettings("bad"), DEFAULT_POST_FEATURED_IMAGE_SETTINGS);
});

test("parsePostFeaturedImageSettings merges valid partial settings", () => {
  assert.deepEqual(parsePostFeaturedImageSettings({ aspectRatio: "1:1", objectFit: "contain" }), {
    ...DEFAULT_POST_FEATURED_IMAGE_SETTINGS,
    aspectRatio: "1:1",
    objectFit: "contain",
  });
});

test("resolveFeaturedImageDisplay applies fit and focal point classes", () => {
  const display = resolveFeaturedImageDisplay(
    mergePostFeaturedImageSettings({ aspectRatio: "4:3", objectFit: "contain", focalPoint: "top" }),
  );
  assert.match(display.containerClassName, /aspect-\[4\/3\]/);
  assert.match(display.imageClassName, /object-contain/);
  assert.equal(display.objectPosition, "top");
});
