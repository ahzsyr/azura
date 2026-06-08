import {
  applyGlassSiteOverlay,
  applySiteBackground,
  clearSiteBackground,
} from "@/features/theme/backgrounds/background-system";
import { getBackgroundTier } from "./effect-tiers";
import type { CapabilityPolicy, EffectModule, EffectRuntimeConfig } from "./types";

let activeEffectId: string | null = null;

function downgradeBackground(
  effectId: string | null,
  policy: CapabilityPolicy,
): string | null {
  if (!effectId || effectId === "none") return null;

  const tier = getBackgroundTier(effectId);

  if (!policy.allowAnimatedBackground) {
    if (effectId === "grid" || effectId === "aurora") return effectId;
    return null;
  }

  if (tier === "heavy" && !policy.allowHeavy) {
    if (effectId === "grid") return "grid";
    return null;
  }

  if (tier === "medium" && !policy.allowMedium && effectId !== "grid") {
    return null;
  }

  return effectId;
}

export const backgroundEngine: EffectModule = {
  initialize() {
    activeEffectId = null;
  },

  update(config: EffectRuntimeConfig, policy: CapabilityPolicy) {
    if (typeof document === "undefined") return;

    applyGlassSiteOverlay(config.glassOverlay);

    if (!config.background.enabled) {
      applySiteBackground("none");
      activeEffectId = null;
      return;
    }

    const effectId = downgradeBackground(config.background.effectId, policy);
    if (effectId === activeEffectId) {
      return;
    }

    activeEffectId = effectId;
    applySiteBackground(effectId, { animationsEnabled: config.animationsEnabled });
  },

  destroy() {
    activeEffectId = null;
    clearSiteBackground();
    applyGlassSiteOverlay(false);
  },
};
