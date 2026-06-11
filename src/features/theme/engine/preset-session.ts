import {
  PRESET_COLORS_STORAGE_KEY,
  PRESET_EFFECTS_STORAGE_KEY,
  PRESET_STORAGE_KEY,
  PRESET_VISUAL_STORAGE_KEY,
} from "./constants";
import type { PresetVisualSnapshot } from "@/features/theme/presets/preset-visual.types";
import type { ApplyPresetPayload, PresetColorTokens, PresetEffectsPayload } from "./types";
import {
  invalidateThemeStorageReadCache,
  readStoredPresetColorsCached,
  readStoredPresetEffectsCached,
  readStoredPresetIdCached,
  readStoredPresetVisualCached,
} from "./storage-read-cache";

export function persistPresetSession(payload: ApplyPresetPayload): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(PRESET_STORAGE_KEY, payload.presetId);
    localStorage.setItem(PRESET_COLORS_STORAGE_KEY, JSON.stringify(payload.colors));
    localStorage.setItem(
      PRESET_EFFECTS_STORAGE_KEY,
      JSON.stringify({
        cursor: payload.cursor ?? null,
        backgroundEffect: payload.backgroundEffect ?? null,
        textEffect: payload.textEffect ?? null,
        cardStyle: payload.cardStyle ?? null,
        borderStyle: payload.borderStyle ?? null,
        backgroundEffectSettings: payload.backgroundEffectSettings ?? null,
      } satisfies PresetEffectsPayload),
    );
    if (payload.visual) {
      localStorage.setItem(PRESET_VISUAL_STORAGE_KEY, JSON.stringify(payload.visual));
    }
    invalidateThemeStorageReadCache();
  } catch {
    // ignore quota errors
  }
}

export function readStoredPresetId(): string | null {
  return readStoredPresetIdCached();
}

export function readStoredPresetColors(): PresetColorTokens | null {
  return readStoredPresetColorsCached();
}

export function readStoredPresetEffects(): PresetEffectsPayload | null {
  return readStoredPresetEffectsCached();
}

export function readStoredPresetVisual(): PresetVisualSnapshot | null {
  return readStoredPresetVisualCached();
}

/** True when the visitor has any stored preset override in localStorage. */
export function hasVisitorThemeOverrides(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return Boolean(
      localStorage.getItem(PRESET_STORAGE_KEY) ||
        localStorage.getItem(PRESET_COLORS_STORAGE_KEY) ||
        localStorage.getItem(PRESET_EFFECTS_STORAGE_KEY) ||
        localStorage.getItem(PRESET_VISUAL_STORAGE_KEY),
    );
  } catch {
    return false;
  }
}

export function patchStoredPresetEffects(patch: Partial<PresetEffectsPayload>): void {
  if (typeof window === "undefined") return;
  try {
    const current = readStoredPresetEffects() ?? {};
    const next: PresetEffectsPayload = { ...current, ...patch };
    localStorage.setItem(PRESET_EFFECTS_STORAGE_KEY, JSON.stringify(next));
    invalidateThemeStorageReadCache();
  } catch {
    // ignore quota errors
  }
}

export function clearPresetSession(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(PRESET_STORAGE_KEY);
    localStorage.removeItem(PRESET_COLORS_STORAGE_KEY);
    localStorage.removeItem(PRESET_EFFECTS_STORAGE_KEY);
    localStorage.removeItem(PRESET_VISUAL_STORAGE_KEY);
    invalidateThemeStorageReadCache();
  } catch {
    // ignore
  }
}
