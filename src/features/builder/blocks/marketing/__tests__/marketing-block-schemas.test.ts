import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { BLOCK_DEFAULTS } from "@/schemas/builder";
import {
  featureGridPropsSchema,
  benefitsGridPropsSchema,
  trustBadgesPropsSchema,
  logoCloudPropsSchema,
  statsCounterPropsSchema,
  beforeAfterPropsSchema,
  extendedHeroPropsSchema,
  extendedCtaPropsSchema,
} from "@/features/builder/blocks/marketing/schemas/marketing-blocks";

describe("marketing block schemas", () => {
  it("parses featureGrid defaults from BLOCK_DEFAULTS", () => {
    const parsed = featureGridPropsSchema.parse(BLOCK_DEFAULTS.featureGrid);
    assert.equal(parsed.columns, 3);
    assert.equal(parsed.items.length, 0);
  });

  it("parses benefitsGrid defaults", () => {
    const parsed = benefitsGridPropsSchema.parse(BLOCK_DEFAULTS.benefitsGrid);
    assert.equal(parsed.layout, "cards");
    assert.equal(parsed.emphasis, "outcome");
  });

  it("parses trustBadges defaults", () => {
    const parsed = trustBadgesPropsSchema.parse(BLOCK_DEFAULTS.trustBadges);
    assert.equal(parsed.layout, "grid");
  });

  it("parses logoCloud defaults", () => {
    const parsed = logoCloudPropsSchema.parse(BLOCK_DEFAULTS.logoCloud);
    assert.equal(parsed.displayMode, "grid");
    assert.equal(parsed.grayscale, true);
  });

  it("parses statsCounter defaults", () => {
    const parsed = statsCounterPropsSchema.parse(BLOCK_DEFAULTS.statsCounter);
    assert.equal(parsed.animateOnView, true);
  });

  it("parses beforeAfter defaults", () => {
    const parsed = beforeAfterPropsSchema.parse(BLOCK_DEFAULTS.beforeAfter);
    assert.equal(parsed.layout, "slider");
    assert.equal(parsed.sliderPosition, 50);
  });

  it("parses extended hero defaults", () => {
    const parsed = extendedHeroPropsSchema.parse(BLOCK_DEFAULTS.hero);
    assert.equal(parsed.layout, "centered");
    assert.equal(parsed.minHeight, "70vh");
  });

  it("parses extended cta defaults", () => {
    const parsed = extendedCtaPropsSchema.parse(BLOCK_DEFAULTS.cta);
    assert.equal(parsed.layout, "centered");
    assert.equal(parsed.countdownEnabled, false);
  });
});
