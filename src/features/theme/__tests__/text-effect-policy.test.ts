import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { downgradeTextEffectForPolicy } from "@/features/theme/downgrade-text-effect";
import { getTextTier } from "@/lib/theme/effects/effect-tiers";
import type { CapabilityPolicy } from "@/lib/theme/effects/types";

const fullPolicy: CapabilityPolicy = {
  allowHeavy: true,
  allowMedium: true,
  allowCustomCursor: true,
  allowAnimatedBackground: true,
  allowTextAnimation: true,
  allowMotion: true,
  allowStagger: true,
};

const mediumOnly: CapabilityPolicy = {
  ...fullPolicy,
  allowHeavy: false,
};

const motionOff: CapabilityPolicy = {
  ...fullPolicy,
  allowTextAnimation: false,
};

describe("getTextTier", () => {
  it("classifies real text effect options", () => {
    assert.equal(getTextTier("neon-glow"), "heavy");
    assert.equal(getTextTier("flicker"), "medium");
    assert.equal(getTextTier("reveal-clip"), "medium");
    assert.equal(getTextTier("3d-rotate"), "heavy");
    assert.equal(getTextTier("shimmer"), "light");
  });
});

describe("downgradeTextEffectForPolicy", () => {
  it("returns the effect when policy allows it", () => {
    assert.equal(downgradeTextEffectForPolicy("gradient-flow", fullPolicy), "gradient-flow");
  });

  it("downgrades heavy effects when heavy is denied", () => {
    assert.equal(downgradeTextEffectForPolicy("neon-glow", mediumOnly), "gradient-flow");
    assert.equal(downgradeTextEffectForPolicy("glitch", mediumOnly), "flicker");
  });

  it("returns null when text animation is disabled", () => {
    assert.equal(downgradeTextEffectForPolicy("wave", motionOff), null);
  });

  it("returns null for none/empty", () => {
    assert.equal(downgradeTextEffectForPolicy("none", fullPolicy), null);
    assert.equal(downgradeTextEffectForPolicy(null, fullPolicy), null);
  });
});
