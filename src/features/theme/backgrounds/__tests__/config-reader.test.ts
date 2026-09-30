import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { runtimeConfigSignature } from "@/features/theme/backgrounds/config-reader";

describe("runtimeConfigSignature", () => {
  it("builds stable signatures for hot-swap dedup", () => {
    const sig = runtimeConfigSignature({
      intensity: 1,
      opacity: 0.9,
      speed: 1.2,
      animationsEnabled: true,
    });
    assert.equal(sig, "1|0.9|1.2|true");
  });

  it("distinguishes config changes", () => {
    const a = runtimeConfigSignature({
      intensity: 1,
      opacity: 1,
      speed: 1,
      animationsEnabled: true,
    });
    const b = runtimeConfigSignature({
      intensity: 1.1,
      opacity: 1,
      speed: 1,
      animationsEnabled: true,
    });
    assert.notEqual(a, b);
  });
});
