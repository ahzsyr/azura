import type { BackgroundEffectSettings, BackgroundRuntimeConfig } from "./types";
import { DEFAULT_BACKGROUND_EFFECT_SETTINGS } from "./types";
import {
  parseVisualEffectSettings,
  resolveVisualEffectRuntimeConfig,
  visualEffectSettingsSignature,
} from "@/features/theme/effect-settings";

/** Normalize persisted or partial settings from DB / form / localStorage. */
export function parseBackgroundEffectSettings(raw: unknown): BackgroundEffectSettings {
  return parseVisualEffectSettings(raw);
}

export function resolveBackgroundRuntimeConfig(
  settings: BackgroundEffectSettings,
  animationSpeed: number,
  animationsEnabled: boolean,
): BackgroundRuntimeConfig {
  return resolveVisualEffectRuntimeConfig(settings, animationSpeed, animationsEnabled);
}

export function backgroundSettingsSignature(settings: BackgroundEffectSettings): string {
  return visualEffectSettingsSignature(settings);
}

export { DEFAULT_BACKGROUND_EFFECT_SETTINGS };
