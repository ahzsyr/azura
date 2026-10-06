import { getTextTier } from "@/lib/theme/effects/effect-tiers";
import type { CapabilityPolicy } from "@/lib/theme/effects/types";

/** CSS-friendly medium fallbacks when heavy text effects are denied. */
const HEAVY_TEXT_FALLBACK: Record<string, string> = {
  "neon-glow": "gradient-flow",
  glitch: "flicker",
  scramble: "typewriter",
  typewriter: "reveal-clip",
  "gradient-flow": "gradient-flow",
  wave: "reveal-clip",
  flicker: "flicker",
  "3d-rotate": "reveal-clip",
  "reveal-clip": "reveal-clip",
};

/**
 * Policy-aware text effect — mirrors downgradeSiteBackgroundForPolicy.
 * Returns null when text animation is disabled or the effect is "none".
 */
export function downgradeTextEffectForPolicy(
  effectId: string | null | undefined,
  policy: CapabilityPolicy,
): string | null {
  const normalized = effectId?.trim() || null;
  if (!normalized || normalized === "none") return null;
  if (!policy.allowTextAnimation) return null;

  const tier = getTextTier(normalized);

  if (tier === "heavy" && !policy.allowHeavy) {
    if (policy.allowMedium) {
      return HEAVY_TEXT_FALLBACK[normalized] ?? "gradient-flow";
    }
    return null;
  }

  if (tier === "medium" && !policy.allowMedium) {
    return null;
  }

  return normalized;
}
