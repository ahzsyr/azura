export type VisualEffectColorOverrides = {
  primary?: string;
  accent?: string;
  secondary?: string;
};

/** Shared tuning shape for background, cursor, and text effects. */
export type VisualEffectSettings = {
  intensity: number;
  opacity: number;
  speed?: number;
  colors?: VisualEffectColorOverrides;
};

/** Motion tab tuning — intensity and opacity only; speed uses global animationSpeed. */
export type MotionSettings = {
  intensity: number;
  opacity: number;
};

export type VisualEffectRuntimeConfig = {
  intensity: number;
  opacity: number;
  speed: number;
  animationsEnabled: boolean;
  colors?: VisualEffectColorOverrides;
};

export type MotionRuntimeConfig = {
  intensity: number;
  opacity: number;
  speed: number;
  animationsEnabled: boolean;
};

export const DEFAULT_VISUAL_EFFECT_SETTINGS: VisualEffectSettings = {
  intensity: 1,
  opacity: 1,
};

export const DEFAULT_MOTION_SETTINGS: MotionSettings = {
  intensity: 1,
  opacity: 1,
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function parseColors(raw: unknown): VisualEffectColorOverrides | undefined {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return undefined;
  const r = raw as Record<string, unknown>;
  const colors: VisualEffectColorOverrides = {};
  if (typeof r.primary === "string" && r.primary.trim()) colors.primary = r.primary.trim();
  if (typeof r.accent === "string" && r.accent.trim()) colors.accent = r.accent.trim();
  if (typeof r.secondary === "string" && r.secondary.trim()) colors.secondary = r.secondary.trim();
  return Object.keys(colors).length > 0 ? colors : undefined;
}

/** Normalize persisted or partial settings from DB / form / localStorage. */
export function parseVisualEffectSettings(raw: unknown): VisualEffectSettings {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return { ...DEFAULT_VISUAL_EFFECT_SETTINGS };
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

/** Normalize motion tab settings (intensity + opacity only). */
export function parseMotionSettings(raw: unknown): MotionSettings {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return { ...DEFAULT_MOTION_SETTINGS };
  }
  const r = raw as Record<string, unknown>;
  const intensity = Number(r.intensity);
  const opacity = Number(r.opacity);
  return {
    intensity: Number.isFinite(intensity) ? clamp(intensity, 0.25, 1.5) : 1,
    opacity: Number.isFinite(opacity) ? clamp(opacity, 0.1, 1) : 1,
  };
}

export function resolveVisualEffectRuntimeConfig(
  settings: VisualEffectSettings,
  animationSpeed: number,
  animationsEnabled: boolean,
): VisualEffectRuntimeConfig {
  const baseSpeed = settings.speed ?? animationSpeed;
  return {
    intensity: settings.intensity,
    opacity: settings.opacity,
    speed: animationsEnabled ? baseSpeed : 0,
    animationsEnabled,
    colors: settings.colors,
  };
}

export function resolveMotionRuntimeConfig(
  settings: MotionSettings,
  animationSpeed: number,
  animationsEnabled: boolean,
): MotionRuntimeConfig {
  return {
    intensity: settings.intensity,
    opacity: settings.opacity,
    speed: animationsEnabled ? animationSpeed : 0,
    animationsEnabled,
  };
}

export function visualEffectSettingsSignature(settings: VisualEffectSettings): string {
  return JSON.stringify({
    intensity: settings.intensity,
    opacity: settings.opacity,
    speed: settings.speed ?? null,
    colors: settings.colors ?? null,
  });
}

export function motionSettingsSignature(settings: MotionSettings): string {
  return JSON.stringify({
    intensity: settings.intensity,
    opacity: settings.opacity,
  });
}
