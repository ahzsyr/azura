import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { defaultAltFromFilename } from "@/features/media/default-alt";

describe("defaultAltFromFilename", () => {
  it("strips extension and humanizes separators", () => {
    assert.equal(defaultAltFromFilename("hero-banner_01.jpg"), "hero banner 01");
    assert.equal(defaultAltFromFilename("path/to/Desert-Camp.png"), "Desert Camp");
  });

  it("returns empty for extension-only names", () => {
    assert.equal(defaultAltFromFilename(".jpg"), "");
  });
});
