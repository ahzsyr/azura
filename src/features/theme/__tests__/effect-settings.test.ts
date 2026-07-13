import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  parseMotionSettings,
  parseVisualEffectSettings,
  resolveMotionRuntimeConfig,
  resolveVisualEffectRuntimeConfig,
  motionSettingsSignature,
  visualEffectSettingsSignature,
} from "@/features/theme/effect-settings";

describe("parseVisualEffectSettings", () => {
  it("returns defaults for invalid input", () => {
    const settings = parseVisualEffectSettings(null);
    assert.equal(settings.intensity, 1);
    assert.equal(settings.opacity, 1);
  });

  it("clamps values to allowed ranges", () => {
    const settings = parseVisualEffectSettings({
      intensity: 2,
      opacity: 0,
      speed: 3,
      colors: { primary: "#ff0000", accent: "#00ff00" },
    });
    assert.equal(settings.intensity, 1.5);
    assert.equal(settings.opacity, 0.1);
    assert.equal(settings.speed, 2);
    assert.equal(settings.colors?.primary, "#ff0000");
    assert.equal(settings.colors?.accent, "#00ff00");
  });
});

describe("parseMotionSettings", () => {
  it("returns defaults for invalid input", () => {
    const settings = parseMotionSettings(undefined);
    assert.equal(settings.intensity, 1);
    assert.equal(settings.opacity, 1);
  });

  it("clamps intensity and opacity", () => {
    const settings = parseMotionSettings({ intensity: 0, opacity: 2 });
    assert.equal(settings.intensity, 0.25);
    assert.equal(settings.opacity, 1);
  });
});

describe("resolveVisualEffectRuntimeConfig", () => {
  it("uses animationSpeed when speed is omitted", () => {
    const runtime = resolveVisualEffectRuntimeConfig({ intensity: 1, opacity: 1 }, 1.25, true);
    assert.equal(runtime.speed, 1.25);
  });

  it("zeros speed when animations are disabled", () => {
    const runtime = resolveVisualEffectRuntimeConfig(
      { intensity: 1, opacity: 1, speed: 1.5 },
      1,
      false,
    );
    assert.equal(runtime.speed, 0);
    assert.equal(runtime.animationsEnabled, false);
  });
});

describe("resolveMotionRuntimeConfig", () => {
  it("uses global animation speed", () => {
    const runtime = resolveMotionRuntimeConfig({ intensity: 0.8, opacity: 0.9 }, 1.5, true);
    assert.equal(runtime.speed, 1.5);
    assert.equal(runtime.intensity, 0.8);
    assert.equal(runtime.opacity, 0.9);
  });
});

describe("settings signatures", () => {
  it("changes when visual effect settings change", () => {
    const a = visualEffectSettingsSignature({ intensity: 1, opacity: 1 });
    const b = visualEffectSettingsSignature({ intensity: 1.2, opacity: 1 });
    assert.notEqual(a, b);
  });

  it("changes when motion settings change", () => {
    const a = motionSettingsSignature({ intensity: 1, opacity: 1 });
    const b = motionSettingsSignature({ intensity: 1, opacity: 0.5 });
    assert.notEqual(a, b);
  });
});
