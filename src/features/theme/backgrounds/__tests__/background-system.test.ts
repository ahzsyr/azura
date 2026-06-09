import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  downgradeSiteBackgroundForPolicy,
  normalizeSiteBackgroundEffect,
  resolveConstrainedSiteEffect,
} from "@/features/theme/backgrounds/background-system";
import type { CapabilityPolicy } from "@/lib/theme/effects/types";
import { buildCapabilityPolicy } from "@/lib/theme/effects/capability-engine";

const fullDesktopPolicy: CapabilityPolicy = {
  allowHeavy: true,
  allowMedium: true,
  allowCustomCursor: true,
  allowAnimatedBackground: true,
  allowTextAnimation: true,
  allowMotion: true,
  allowStagger: true,
};

const constrainedDesktopPolicy: CapabilityPolicy = {
  allowHeavy: false,
  allowMedium: true,
  allowCustomCursor: true,
  allowAnimatedBackground: false,
  allowTextAnimation: true,
  allowMotion: true,
  allowStagger: true,
};

const lowEndDesktopPolicy: CapabilityPolicy = {
  allowHeavy: false,
  allowMedium: false,
  allowCustomCursor: false,
  allowAnimatedBackground: true,
  allowTextAnimation: true,
  allowMotion: true,
  allowStagger: true,
};

describe("resolveConstrainedSiteEffect", () => {
  it("keeps static grid and aurora effects", () => {
    assert.equal(resolveConstrainedSiteEffect("grid"), "grid");
    assert.equal(resolveConstrainedSiteEffect("aurora"), "aurora");
  });

  it("downgrades animated effects to grid", () => {
    assert.equal(resolveConstrainedSiteEffect("waves"), "grid");
    assert.equal(resolveConstrainedSiteEffect("particles"), "grid");
    assert.equal(resolveConstrainedSiteEffect("circuit"), "grid");
  });

  it("returns none for none", () => {
    assert.equal(resolveConstrainedSiteEffect("none"), "none");
  });
});

describe("downgradeSiteBackgroundForPolicy", () => {
  it("returns null for inactive effects", () => {
    assert.equal(downgradeSiteBackgroundForPolicy(null, fullDesktopPolicy), null);
    assert.equal(downgradeSiteBackgroundForPolicy("none", fullDesktopPolicy), null);
  });

  it("passes through full-capability desktop effects", () => {
    assert.equal(downgradeSiteBackgroundForPolicy("waves", fullDesktopPolicy), "waves");
    assert.equal(downgradeSiteBackgroundForPolicy("circuit", fullDesktopPolicy), "circuit");
  });

  it("downgrades constrained desktop waves to grid (not none)", () => {
    const result = downgradeSiteBackgroundForPolicy("waves", constrainedDesktopPolicy);
    assert.equal(result, "grid");
    assert.notEqual(result, null);
  });

  it("downgrades heavy effects on low-end desktop to grid", () => {
    assert.equal(downgradeSiteBackgroundForPolicy("waves", lowEndDesktopPolicy), "grid");
    assert.equal(downgradeSiteBackgroundForPolicy("circuit", lowEndDesktopPolicy), "grid");
  });

  it("matches block-layer constrained fallback for the same effect", () => {
    const site = downgradeSiteBackgroundForPolicy("hexagons", constrainedDesktopPolicy);
    const block = resolveConstrainedSiteEffect(normalizeSiteBackgroundEffect("hexagons"));
    assert.equal(site, block);
  });
});

describe("buildCapabilityPolicy desktop backgrounds", () => {
  it("allows animated site backgrounds on low-end desktop (non-mobile)", () => {
    const policy = buildCapabilityPolicy({
      prefersReducedMotion: false,
      lowEndDevice: true,
      touchOnly: false,
      smallScreen: false,
      hardwareConcurrency: 4,
      deviceMemoryGb: 4,
      effectiveConnection: "4g",
    });
    assert.equal(policy.allowAnimatedBackground, true);
    assert.equal(policy.allowHeavy, false);
    assert.equal(downgradeSiteBackgroundForPolicy("waves", policy), "grid");
  });
});
