import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { initialMediaPickerMode } from "@/features/media/lib/media-picker-mode";

describe("initialMediaPickerMode", () => {
  it("uses upload mode when mediaAssetId is set", () => {
    assert.equal(initialMediaPickerMode("asset-123", ""), "upload");
  });

  it("uses upload mode for site filesystem URLs without mediaAssetId", () => {
    assert.equal(initialMediaPickerMode(null, "/uploads/images/hero.jpg"), "upload");
  });

  it("uses upload mode for external URLs without mediaAssetId", () => {
    assert.equal(initialMediaPickerMode(null, "https://example.com/image.jpg"), "upload");
  });

  it("defaults to link mode when empty", () => {
    assert.equal(initialMediaPickerMode(null, ""), "link");
  });
});
