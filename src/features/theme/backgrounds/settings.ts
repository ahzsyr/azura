import type { BackgroundEffectSettings, BackgroundRuntimeConfig } from "./types";
import { DEFAULT_BACKGROUND_EFFECT_SETTINGS } from "./types";

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function parseColors(raw: unknown): BackgroundEffectSettings["colors"] | undefined {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return undefined;
  const r = raw as Record<string, unknown>;
  const colors: NonNullable<BackgroundEffectSettings["colors"]> = {};
  if (typeof r.primary === "string" && r.primary.trim()) colors.primary = r.primary.trim();
  if (typeof r.accent === "string" && r.accent.trim()) colors.accent = r.accent.trim();
  if (typeof r.secondary === "string" && r.secondary.trim()) colors.secondary = r.secondary.trim();
  return Object.keys(colors).length > 0 ? colors : undefined;
}

/** Normalize persisted or partial settings from DB / form / localStorage. */
export function parseBackgroundEffectSettings(raw: unknown): BackgroundEffectSettings {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return { ...DEFAULT_BACKGROUND_EFFECT_SETTINGS };
  }
  const r = raw as Record<string, unknown>;
  const intensity = Number(r.intensity);
  const opacity = Number(r.opacity);
  const speed = r.speed != null ? Number(r.speed) : undefined;
  return {
    intensity: Number.isFinite(intensity) ? clamp(intensity, 0.25, 1.5) : 1,
    opacity: Number.isFinite(opacity) ? clamp(opacity, 0.1, 1) : 1,
    speed: speed != null && Number.isFinite(speed) ? clamp(speed, 0.25, 2) : undefined,
    colors: parseColors(r.colors),
  };
}

export function resolveBackgroundRuntimeConfig(
  settings: BackgroundEffectSettings,
  animationSpeed: number,
  animationsEnabled: boolean,
): BackgroundRuntimeConfig {
  const baseSpeed = settings.speed ?? animationSpeed;
  return {
    intensity: settings.intensity,
    opacity: settings.opacity,
    speed: animationsEnabled ? baseSpeed : 0,
    animationsEnabled,
    colors: settings.colors,
  };
}

export function backgroundSettingsSignature(settings: BackgroundEffectSettings): string {
  return JSON.stringify({
    intensity: settings.intensity,
    opacity: settings.opacity,
    speed: settings.speed ?? null,
    colors: settings.colors ?? null,
  });
}
