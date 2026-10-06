import { applyEffectSettingsCssVars } from "@/features/theme/apply-effect-settings-css-vars";
import { visualEffectSettingsSignature } from "@/features/theme/effect-settings";
import { syncLiquidGlassController } from "@/features/theme/liquid-glass-controller";
import type { ResolvedVisualExperience } from "@/features/theme/visual-experience-resolver";
import { getCapabilities } from "@/lib/theme/effects/capability-engine";
import { mapVisualExperienceToEffectConfig } from "@/lib/theme/effects/inheritance";
import {
  clearAllTaggedTextEffects,
  rescanTextEffectTargets,
} from "@/lib/theme/effects/text-engine";
import { visualEffectsEngine } from "@/lib/theme/effects/visual-effects-engine";

let lastAppliedAppearance: ResolvedAppearance | null = null;
let lastTextEffectSignature: string | null = null;

type ResolvedAppearance = "light" | "dark";

function currentDocumentAppearance(): ResolvedAppearance {
  return document.documentElement.dataset.theme === "light" ? "light" : "dark";
}

function buildTextEffectSignature(
  resolved: ResolvedVisualExperience,
  allowTextAnimation: boolean,
): string {
  const { textEffect, animationsEnabled, textEffectSettings } = resolved;
  if (!animationsEnabled || !allowTextAnimation || !textEffect || textEffect === "none") {
    return "none";
  }
  return `${textEffect}|${visualEffectSettingsSignature(textEffectSettings)}`;
}

function applyChromeDatasets(resolved: ResolvedVisualExperience): void {
  const html = document.documentElement;
  const { cardStyle, borderStyle, glassEffectEnabled } = resolved;

  if (cardStyle) {
    html.dataset.cardStyle = cardStyle;
  } else {
    delete html.dataset.cardStyle;
  }

  if (borderStyle) {
    html.dataset.borderStyle = borderStyle;
  } else {
    delete html.dataset.borderStyle;
  }

  html.dataset.glassEffect = glassEffectEnabled ? "liquid" : "off";
  syncLiquidGlassController(Boolean(glassEffectEnabled));
}

export type ApplyVisualEffectsOptions = {
  /** Skip canvas/cursor/text remount — appearance color refresh only. */
  colorsOnly?: boolean;
};

/**
 * Apply pre-resolved visual experience.
 * CSS vars stay here; cursor/text/background modules run via visualEffectsEngine.
 */
export function applyVisualEffects(
  resolved: ResolvedVisualExperience,
  options?: ApplyVisualEffectsOptions,
) {
  if (typeof document === "undefined") return;

  const appearance = currentDocumentAppearance();

  if (options?.colorsOnly) {
    applyEffectSettingsCssVars(resolved);
    applyChromeDatasets(resolved);
    lastAppliedAppearance = appearance;
    return;
  }

  applyEffectSettingsCssVars(resolved);
  applyChromeDatasets(resolved);

  const { policy } = getCapabilities();
  const textEffectSignature = buildTextEffectSignature(resolved, policy.allowTextAnimation);
  lastTextEffectSignature = textEffectSignature;
  lastAppliedAppearance = appearance;

  visualEffectsEngine.update(
    mapVisualExperienceToEffectConfig({
      cursorEffect: resolved.cursorEffect,
      backgroundEffect: resolved.backgroundEffect,
      textEffect: resolved.textEffect,
      animationsEnabled: resolved.animationsEnabled,
      cursorEnabled: resolved.cursorEnabled,
      backgroundEnabled: resolved.backgroundEnabled,
      textEnabled: resolved.textEnabled,
      glassEffectEnabled: resolved.glassEffectEnabled,
      cardStyle: resolved.cardStyle,
    }),
  );
}

/** Re-tag and apply text effects for targets mounted after the initial effects pass. */
export function rescanTextEffects(
  textEffect: string | null | undefined,
  animationsEnabled = true,
): void {
  if (typeof document === "undefined") return;
  const { policy } = getCapabilities();
  rescanTextEffectTargets(textEffect, animationsEnabled, policy);
}

export function clearVisualEffects() {
  if (typeof document === "undefined") return;
  lastAppliedAppearance = null;
  lastTextEffectSignature = null;
  visualEffectsEngine.destroy();
  clearAllTaggedTextEffects();
  delete document.body.dataset.cursor;
  delete document.body.dataset.bgEffect;
  delete document.documentElement.dataset.textEffectTheme;
  delete document.documentElement.dataset.siteCursorEffects;
  delete document.documentElement.dataset.cardStyle;
  delete document.documentElement.dataset.borderStyle;
  delete document.documentElement.dataset.glassEffect;
  syncLiquidGlassController(false);
}

/** @internal test / debug */
export function getLastTextEffectSignature(): string | null {
  return lastTextEffectSignature;
}
