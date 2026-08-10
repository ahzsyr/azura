import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  parseBackgroundEffectSettings,
  resolveBackgroundRuntimeConfig,
  backgroundSettingsSignature,
} from "@/features/theme/backgrounds/settings";

describe("parseBackgroundEffectSettings", () => {
  it("returns defaults for invalid input", () => {
    const settings = parseBackgroundEffectSettings(null);
    assert.equal(settings.intensity, 1);
    assert.equal(settings.opacity, 1);
  });

  it("clamps values to allowed ranges", () => {
    const settings = parseBackgroundEffectSettings({
      intensity: 2,
      opacity: 0,
      speed: 3,
      colors: { primary: "#ff0000" },
    });
    assert.equal(settings.intensity, 1.5);
    assert.equal(settings.opacity, 0.1);
    assert.equal(settings.speed, 2);
    assert.equal(settings.colors?.primary, "#ff0000");
  });
});

describe("resolveBackgroundRuntimeConfig", () => {
  it("uses animationSpeed when speed is omitted", () => {
    const runtime = resolveBackgroundRuntimeConfig({ intensity: 1, opacity: 1 }, 1.25, true);
    assert.equal(runtime.speed, 1.25);
  });

  it("zeros speed when animations are disabled", () => {
    const runtime = resolveBackgroundRuntimeConfig({ intensity: 1, opacity: 1, speed: 1.5 }, 1, false);
    assert.equal(runtime.speed, 0);
    assert.equal(runtime.animationsEnabled, false);
  });
});

describe("backgroundSettingsSignature", () => {
  it("changes when settings change", () => {
    const a = backgroundSettingsSignature({ intensity: 1, opacity: 1 });
    const b = backgroundSettingsSignature({ intensity: 1.2, opacity: 1 });
    assert.notEqual(a, b);
  });
});
