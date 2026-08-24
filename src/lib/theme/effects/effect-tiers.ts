import type {
  CapabilityPolicy,
  EffectEngineWarning,
  EffectRuntimeConfig,
  EffectTier,
} from "./types";

const HEAVY_BACKGROUNDS = new Set([
  "particles",
  "stars",
  "matrix",
  "bubbles",
  "hexagons",
  "geometric",
  "vortex",
  "aurora",
  "waves",
  "circuit",
]);

const MEDIUM_BACKGROUNDS = new Set(["noise", "grid"]);

const HEAVY_TEXT = new Set(["neon-glow", "glitch", "gradient-flow", "scramble", "typewriter"]);

const MEDIUM_TEXT = new Set(["shimmer", "wave", "reveal"]);

const HEAVY_CURSORS = new Set(["blob", "magnetic", "spotlight", "ring-trail"]);

const MEDIUM_CURSORS = new Set(["crosshair", "neon-arrow", "pixel"]);

export function getBackgroundTier(effectId: string | null): EffectTier {
  if (!effectId || effectId === "none") return "light";
  if (HEAVY_BACKGROUNDS.has(effectId)) return "heavy";
  if (MEDIUM_BACKGROUNDS.has(effectId)) return "medium";
  return "light";
}

export function getTextTier(effectId: string | null): EffectTier {
  if (!effectId || effectId === "none") return "light";
  if (HEAVY_TEXT.has(effectId)) return "heavy";
  if (MEDIUM_TEXT.has(effectId)) return "medium";
  return "light";
}

export function getCursorTier(effectId: string | null): EffectTier {
  if (!effectId || effectId === "none" || effectId === "default") return "light";
  if (HEAVY_CURSORS.has(effectId)) return "heavy";
  if (MEDIUM_CURSORS.has(effectId)) return "medium";
  return "light";
}

export function collectEffectWarnings(
  config: EffectRuntimeConfig,
  policy: CapabilityPolicy,
): EffectEngineWarning[] {
  const warnings: EffectEngineWarning[] = [];

  if (config.background.enabled && config.background.effectId) {
    const tier = getBackgroundTier(config.background.effectId);
    if (tier === "heavy" && !policy.allowHeavy) {
      warnings.push({
        tier,
        effectType: "background",
        effectId: config.background.effectId,
        message: `Background "${config.background.effectId}" is heavy and may be reduced on this device.`,
      });
    } else if (tier === "heavy" || tier === "medium") {
      warnings.push({
        tier,
        effectType: "background",
        effectId: config.background.effectId,
        message: `Background "${config.background.effectId}" has ${tier} performance cost.`,
      });
    }
  }

  if (config.cursor.enabled && config.cursor.effectId) {
    const tier = getCursorTier(config.cursor.effectId);
    if (!policy.allowCustomCursor) {
      warnings.push({
        tier,
        effectType: "cursor",
        effectId: config.cursor.effectId,
        message: "Custom cursor disabled on touch-only or low-end devices.",
      });
    } else if (tier !== "light") {
      warnings.push({
        tier,
        effectType: "cursor",
        effectId: config.cursor.effectId,
        message: `Cursor "${config.cursor.effectId}" has ${tier} performance cost.`,
      });
    }
  }

  if (config.text.enabled && config.text.effectId) {
    const tier = getTextTier(config.text.effectId);
    if (tier === "heavy" && !policy.allowTextAnimation) {
      warnings.push({
        tier,
        effectType: "text",
        effectId: config.text.effectId,
        message: `Text effect "${config.text.effectId}" may be skipped when motion is reduced.`,
      });
    } else if (tier !== "light") {
      warnings.push({
        tier,
        effectType: "text",
        effectId: config.text.effectId,
        message: `Text effect "${config.text.effectId}" has ${tier} performance cost.`,
      });
    }
  }

  return warnings;
}
