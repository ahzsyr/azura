import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  buildTextEffectShimmerGradient,
  parseMotionSettings,
  parseVisualEffectSettings,
  resolveMotionRuntimeConfig,
  resolveVisualEffectRuntimeConfig,
  motionSettingsSignature,
  visualEffectSettingsSignature,
} from "@/features/theme/effect-settings";
import { buildEffectSettingsCssVarEntries } from "@/features/theme/apply-effect-settings-css-vars";
import type { ResolvedVisualExperience } from "@/features/theme/visual-experience-resolver";

function baseResolved(
  patch: Partial<ResolvedVisualExperience> = {},
): ResolvedVisualExperience {
  return {
    cursorEffect: null,
    backgroundEffect: null,
    textEffect: "gradient-flow",
    animationsEnabled: true,
    cardStyle: null,
    borderStyle: null,
    cursorEnabled: false,
    backgroundEnabled: false,
    textEnabled: true,
    backgroundEffectSettings: { intensity: 1, opacity: 1 },
    cursorEffectSettings: { intensity: 1, opacity: 1 },
    textEffectSettings: { intensity: 1, opacity: 1 },
    motionSettings: { intensity: 1, opacity: 1 },
    animationSpeed: 1,
    ...patch,
  };
}

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

describe("buildEffectSettingsCssVarEntries", () => {
  it("emits text-effect intensity/opacity/speed vars", () => {
    const entries = Object.fromEntries(
      buildEffectSettingsCssVarEntries(
        baseResolved({
          textEffectSettings: { intensity: 0.7, opacity: 0.9, speed: 0.45 },
        }),
      ),
    );
    assert.equal(entries["--text-effect-intensity"], "0.7");
    assert.equal(entries["--text-effect-opacity"], "0.9");
    assert.equal(entries["--text-effect-speed"], "0.45");
    assert.equal(entries["--text-effect-gradient"], undefined);
  });

  it("emits a soft shimmer gradient when color overrides are set", () => {
    const entries = Object.fromEntries(
      buildEffectSettingsCssVarEntries(
        baseResolved({
          textEffectSettings: {
            intensity: 1,
            opacity: 1,
            colors: { primary: "#c9a84c", accent: "#f0d080" },
          },
        }),
      ),
    );
    assert.equal(entries["--text-effect-primary"], "#c9a84c");
    assert.equal(entries["--text-effect-accent"], "#f0d080");
    assert.equal(
      entries["--text-effect-gradient"],
      buildTextEffectShimmerGradient("#c9a84c", "#f0d080"),
    );
    assert.match(entries["--text-effect-gradient"]!, /38%/);
    assert.match(entries["--text-effect-gradient"]!, /color-mix/);
  });
});

describe("buildTextEffectShimmerGradient", () => {
  it("builds faded-edge stops around the highlight", () => {
    const gradient = buildTextEffectShimmerGradient("#c9a84c", "#f0d080");
    assert.match(gradient, /^linear-gradient\(105deg,/);
    assert.match(gradient, /#c9a84c 38%/);
    assert.match(gradient, /#f0d080 50%/);
    assert.match(gradient, /#c9a84c 62%/);
    assert.match(gradient, /color-mix\(in srgb, #f0d080 55%, #c9a84c\)/);
  });
});
