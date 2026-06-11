import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { IMAGE_PICKER_MEDIA_TYPES } from "@/features/media/constants";
import { mediaTypesToKey, parseMediaTypesKey } from "@/features/media/lib/media-picker-types";

describe("media-picker-types", () => {
  it("mediaTypesToKey is stable for the same logical types", () => {
    const a = mediaTypesToKey(IMAGE_PICKER_MEDIA_TYPES);
    const b = mediaTypesToKey(["IMAGE", "SVG"]);
    assert.equal(a, b);
    assert.equal(a, "IMAGE,SVG");
  });

  it("parseMediaTypesKey round-trips image picker types", () => {
    const key = mediaTypesToKey(IMAGE_PICKER_MEDIA_TYPES);
    assert.deepEqual(parseMediaTypesKey(key), ["IMAGE", "SVG"]);
  });

  it("parseMediaTypesKey returns undefined for empty key", () => {
    assert.equal(parseMediaTypesKey(""), undefined);
  });
});
