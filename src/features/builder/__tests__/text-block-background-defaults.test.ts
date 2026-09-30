import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { BLOCK_DEFAULTS } from "@/schemas/builder";

describe("text block background defaults", () => {
  it("includes the live background fields required by the renderer", () => {
    assert.equal(BLOCK_DEFAULTS.text.backgroundType, "solid");
    assert.equal(BLOCK_DEFAULTS.text.backgroundColor, "");
    assert.equal(BLOCK_DEFAULTS.text.imageUrl, "");
    assert.equal(BLOCK_DEFAULTS.text.videoUrl, "");
  });
});
