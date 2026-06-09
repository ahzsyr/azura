import {
  mapVisualExperienceToEffectConfig,
  visualEffectsEngine,
} from "@/lib/theme/effects";
import type { ResolvedVisualExperience } from "@/features/theme/visual-experience-resolver";
import {
  markEffectCostEnd,
  markEffectCostStart,
} from "@/lib/performance/theme-performance";

let lastAppliedEffectSignature: string | null = null;

function isInactiveEffectId(id: string | null | undefined): boolean {
  return !id || id === "none";
}

function shouldSkipEffectsEngine(resolved: ResolvedVisualExperience): boolean {
  if (resolved.animationsEnabled !== false) return false;
  return (
    isInactiveEffectId(resolved.cursorEffect) &&
    isInactiveEffectId(resolved.backgroundEffect) &&
    isInactiveEffectId(resolved.textEffect)
  );
}

/** Theme surface DOM hooks (not part of the effects engine). */
export function applyThemeSurfaceHooks(resolved: ResolvedVisualExperience): void {
  if (typeof document === "undefined") return;
  const html = document.documentElement;

  if (resolved.cardStyle) {
    html.dataset.cardStyle = resolved.cardStyle;
  } else {
    delete html.dataset.cardStyle;
  }

  if (resolved.borderStyle) {
    html.dataset.borderStyle = resolved.borderStyle;
  } else {
    delete html.dataset.borderStyle;
  }
}

/** Apply pre-resolved visual experience via the isolated effects engine. */
export function applyVisualEffects(resolved: ResolvedVisualExperience): void {
  applyThemeSurfaceHooks(resolved);

  const config = mapVisualExperienceToEffectConfig(resolved);
  const signature = JSON.stringify(config);
  if (signature === lastAppliedEffectSignature) return;

  if (shouldSkipEffectsEngine(resolved)) {
    visualEffectsEngine.destroy();
    lastAppliedEffectSignature = signature;
    return;
  }

  markEffectCostStart();
  visualEffectsEngine.update(config);
  lastAppliedEffectSignature = signature;
  markEffectCostEnd();
}

export function clearVisualEffects(): void {
  lastAppliedEffectSignature = null;
  visualEffectsEngine.destroy();
  if (typeof document === "undefined") return;
  const html = document.documentElement;
  delete html.dataset.cardStyle;
  delete html.dataset.borderStyle;
}

export { visualEffectsEngine, mapVisualExperienceToEffectConfig } from "@/lib/theme/effects";
