import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { RELEASE_PRESET_ID } from "@/presets/release/manifest";

describe("release preset package", () => {
  it("exports release preset id", () => {
    assert.equal(RELEASE_PRESET_ID, "release");
  });
});
