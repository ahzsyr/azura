import { isSiteBackgroundCanvasReady } from "@/features/theme/backgrounds/site-runtime";
import { backgroundSettingsSignature } from "@/features/theme/backgrounds/settings";
import {
  motionSettingsSignature,
  visualEffectSettingsSignature,
} from "@/features/theme/effect-settings";
import type { ResolvedVisualExperience } from "@/features/theme/visual-experience-resolver";
import {
  applyVisualEffects,
  type ApplyVisualEffectsOptions,
} from "@/features/theme/effects-runtime";
import { deferUntilIdle } from "@/lib/performance/defer-until-idle";

export type ScheduleApplyOptions = {
  colorsOnly?: boolean;
  immediate?: boolean;
  force?: boolean;
};

function currentAppearance(): "light" | "dark" {
  if (typeof document === "undefined") return "light";
  return document.documentElement.dataset.theme === "light" ? "light" : "dark";
}

function buildEffectSignature(resolved: ResolvedVisualExperience): string {
  return [
    resolved.backgroundEffect ?? "",
    resolved.backgroundEnabled ? "1" : "0",
    resolved.cursorEffect ?? "",
    resolved.cursorEnabled ? "1" : "0",
    resolved.textEffect ?? "",
    resolved.textEnabled ? "1" : "0",
    resolved.cardStyle ?? "",
    resolved.borderStyle ?? "",
    resolved.animationsEnabled ? "1" : "0",
    String(resolved.animationSpeed),
    backgroundSettingsSignature(resolved.backgroundEffectSettings),
    visualEffectSettingsSignature(resolved.cursorEffectSettings),
    visualEffectSettingsSignature(resolved.textEffectSettings),
    motionSettingsSignature(resolved.motionSettings),
  ].join("|");
}

function buildFullSignature(resolved: ResolvedVisualExperience, appearance: "light" | "dark"): string {
  return `${appearance}|${buildEffectSignature(resolved)}`;
}

/** True when no site background layer is required, or the canvas has finished mounting. */
function isSiteBackgroundLayerPresent(resolved: ResolvedVisualExperience): boolean {
  if (!resolved.backgroundEnabled) return true;
  const effect = resolved.backgroundEffect;
  if (!effect || effect === "none") return true;
  if (typeof document === "undefined") return true;
  return isSiteBackgroundCanvasReady();
}

let lastAppliedFullSignature: string | null = null;
let lastEffectSignature: string | null = null;
let lastAppliedAppearance: "light" | "dark" | null = null;
let pendingCancel: (() => void) | null = null;

function runApply(
  resolved: ResolvedVisualExperience,
  applyOptions: ApplyVisualEffectsOptions,
): void {
  applyVisualEffects(resolved, applyOptions);
  const appearance = currentAppearance();
  lastEffectSignature = buildEffectSignature(resolved);
  lastAppliedAppearance = appearance;
  lastAppliedFullSignature = buildFullSignature(resolved, appearance);
}

export function resetVisualEffectsCoordinator(): void {
  lastAppliedFullSignature = null;
  lastEffectSignature = null;
  lastAppliedAppearance = null;
  pendingCancel?.();
  pendingCancel = null;
}

export function forceApplyVisualEffects(resolved: ResolvedVisualExperience): void {
  resetVisualEffectsCoordinator();
  runApply(resolved, {});
}

export function scheduleApplyVisualEffects(
  resolved: ResolvedVisualExperience,
  options: ScheduleApplyOptions = {},
): void {
  if (typeof window === "undefined") return;

  const appearance = currentAppearance();
  const effectSignature = buildEffectSignature(resolved);
  const fullSignature = buildFullSignature(resolved, appearance);

  const appearanceOnlyChange =
    lastEffectSignature === effectSignature &&
    lastAppliedAppearance !== null &&
    lastAppliedAppearance !== appearance;

  const colorsOnly = options.colorsOnly ?? appearanceOnlyChange;

  if (
    !options.force &&
    !colorsOnly &&
    lastAppliedFullSignature === fullSignature &&
    isSiteBackgroundLayerPresent(resolved)
  ) {
    return;
  }

  if (!options.force && colorsOnly && lastEffectSignature === effectSignature && !appearanceOnlyChange) {
    return;
  }

  pendingCancel?.();
  pendingCancel = null;

  const execute = () => {
    runApply(resolved, colorsOnly ? { colorsOnly: true } : {});
  };

  if (options.immediate) {
    execute();
    return;
  }

  pendingCancel = deferUntilIdle(execute);
}
