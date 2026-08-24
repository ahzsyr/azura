import { initCursor } from "@/features/theme/effects/cursors";
import { getCursorTier } from "./effect-tiers";
import type { CapabilityPolicy, EffectModule, EffectRuntimeConfig } from "./types";

let activeCursorId: string | null = null;

function resolveCursorEffect(
  effectId: string | null,
  policy: CapabilityPolicy,
): string | null {
  if (!effectId || effectId === "none" || effectId === "default") return null;
  if (!policy.allowCustomCursor) return null;

  const tier = getCursorTier(effectId);
  if (tier === "heavy" && !policy.allowHeavy) return null;
  if (tier === "medium" && !policy.allowMedium) return null;

  return effectId;
}

export const cursorEngine: EffectModule = {
  initialize() {
    activeCursorId = null;
  },

  update(config: EffectRuntimeConfig, policy: CapabilityPolicy) {
    if (typeof document === "undefined") return;

    const html = document.documentElement;
    const body = document.body;

    if (!config.cursor.enabled) {
      delete body.dataset.cursor;
      html.dataset.siteCursorEffects = "off";
      initCursor("default");
      activeCursorId = null;
      return;
    }

    const effectId = resolveCursorEffect(config.cursor.effectId, policy);
    html.dataset.siteCursorEffects = effectId ? "on" : "off";

    if (effectId) {
      body.dataset.cursor = effectId;
    } else {
      delete body.dataset.cursor;
    }

    if (!config.animationsEnabled) {
      initCursor("default");
      activeCursorId = null;
      return;
    }

    const next = effectId ?? "default";
    if (next === activeCursorId) return;
    activeCursorId = next;
    initCursor(next);
  },

  destroy() {
    if (typeof document === "undefined") return;
    activeCursorId = null;
    initCursor("default");
    delete document.body.dataset.cursor;
    delete document.documentElement.dataset.siteCursorEffects;
    document.body.style.cursor = "";
  },
};
