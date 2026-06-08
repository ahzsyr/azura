import {
  mapVisualExperienceToEffectConfig,
  visualEffectsEngine,
} from "@/lib/theme/effects";
import type { ResolvedVisualExperience } from "@/features/theme/visual-experience-resolver";
import {
  markEffectCostEnd,
  markEffectCostStart,
} from "@/lib/performance/theme-performance";

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
  markEffectCostStart();
  applyThemeSurfaceHooks(resolved);
  visualEffectsEngine.update(mapVisualExperienceToEffectConfig(resolved));
  markEffectCostEnd();
}

export function clearVisualEffects(): void {
  visualEffectsEngine.destroy();
  if (typeof document === "undefined") return;
  const html = document.documentElement;
  delete html.dataset.cardStyle;
  delete html.dataset.borderStyle;
}

export { visualEffectsEngine, mapVisualExperienceToEffectConfig } from "@/lib/theme/effects";
