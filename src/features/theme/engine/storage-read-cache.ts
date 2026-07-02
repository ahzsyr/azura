import type { PresetVisualSnapshot } from "@/features/theme/presets/preset-visual.types";
import type { PresetColorTokens, PresetEffectsPayload } from "./types";
import {
  PRESET_COLORS_STORAGE_KEY,
  PRESET_EFFECTS_STORAGE_KEY,
  PRESET_STORAGE_KEY,
  PRESET_VISUAL_STORAGE_KEY,
} from "./constants";

type CacheSlot<T> = T | null | undefined;

let presetIdCache: CacheSlot<string> = undefined;
let colorsCache: CacheSlot<PresetColorTokens> = undefined;
let effectsCache: CacheSlot<PresetEffectsPayload> = undefined;
let visualCache: CacheSlot<PresetVisualSnapshot> = undefined;

/** Clear cached localStorage reads after writes or theme change events. */
export function invalidateThemeStorageReadCache(): void {
  presetIdCache = undefined;
  colorsCache = undefined;
  effectsCache = undefined;
  visualCache = undefined;
}

function readJson<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function readStoredPresetIdCached(): string | null {
  if (typeof window === "undefined") return null;
  if (presetIdCache !== undefined) return presetIdCache;
  try {
    presetIdCache = localStorage.getItem(PRESET_STORAGE_KEY);
  } catch {
    presetIdCache = null;
  }
  return presetIdCache;
}

export function readStoredPresetColorsCached(): PresetColorTokens | null {
  if (typeof window === "undefined") return null;
  if (colorsCache !== undefined) return colorsCache;
  colorsCache = readJson<PresetColorTokens>(PRESET_COLORS_STORAGE_KEY);
  return colorsCache;
}

export function readStoredPresetEffectsCached(): PresetEffectsPayload | null {
  if (typeof window === "undefined") return null;
  if (effectsCache !== undefined) return effectsCache;
  effectsCache = readJson<PresetEffectsPayload>(PRESET_EFFECTS_STORAGE_KEY);
  return effectsCache;
}

export function readStoredPresetVisualCached(): PresetVisualSnapshot | null {
  if (typeof window === "undefined") return null;
  if (visualCache !== undefined) return visualCache;
  visualCache = readJson<PresetVisualSnapshot>(PRESET_VISUAL_STORAGE_KEY);
  return visualCache;
}
