import {
  PRESET_COLORS_STORAGE_KEY,
  PRESET_EFFECTS_STORAGE_KEY,
  PRESET_ORIGIN_STORAGE_KEY,
  PRESET_STORAGE_KEY,
  PRESET_VISUAL_STORAGE_KEY,
  USER_PRESETS_STORAGE_KEY,
} from "./constants";
import type { PresetVisualSnapshot } from "@/features/theme/presets/preset-visual.types";
import type {
  AppearanceMode,
  ApplyPresetPayload,
  PresetColorTokens,
  PresetEffectsPayload,
  VisitorPersonalization,
} from "./types";
import {
  invalidateThemeStorageReadCache,
  readStoredPresetColorsCached,
  readStoredPresetEffectsCached,
  readStoredPresetIdCached,
  readStoredPresetVisualCached,
} from "./storage-read-cache";

/** Who requested the preset apply — editor/preview must not leak into visitor storage. */
export type PresetSessionScope = "visitor" | "editor";

export type PersistPresetSessionOptions = {
  scope?: PresetSessionScope;
};

/** Theme Studio / admin / preview surfaces — never persist visitor overrides. */
export function isEditorThemeRoute(pathname?: string): boolean {
  let path = pathname;
  if (path == null && typeof window !== "undefined") {
    try {
      path = window.location?.pathname ?? "";
    } catch {
      path = "";
    }
  }
  path ??= "";
  return path.startsWith("/admin") || path.startsWith("/preview");
}

export function resolvePresetSessionScope(
  explicit?: PresetSessionScope,
  pathname?: string,
): PresetSessionScope {
  if (explicit) return explicit;
  return isEditorThemeRoute(pathname) ? "editor" : "visitor";
}

export function persistPresetSession(
  payload: ApplyPresetPayload,
  options?: PersistPresetSessionOptions,
): void {
  if (typeof window === "undefined") return;
  const scope = resolvePresetSessionScope(options?.scope);
  if (scope === "editor") return;
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
    localStorage.setItem(PRESET_ORIGIN_STORAGE_KEY, "visitor");
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

export function readVisitorPersonalization(
  fallbackAppearanceMode: AppearanceMode,
): VisitorPersonalization {
  const effects = readStoredPresetEffects() ?? {};
  return {
    visitorPresetId: readStoredPresetId(),
    appearanceMode: fallbackAppearanceMode,
    cursorEffect: effects.cursor ?? null,
    backgroundEffect: effects.backgroundEffect ?? null,
    textEffect: effects.textEffect ?? null,
    cardStyle: effects.cardStyle ?? null,
    borderStyle: effects.borderStyle ?? null,
  };
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
    localStorage.removeItem(PRESET_ORIGIN_STORAGE_KEY);
    invalidateThemeStorageReadCache();
  } catch {
    // ignore
  }
}

/**
 * Drop leaked Theme Studio / preview snapshots that outrank the published site.
 * Keeps intentional visitor personalization (origin=visitor + catalog/user id).
 */
export function shouldClearLeakedVisitorPreset(input: {
  presetId: string | null;
  origin: string | null;
  publishedPresetIds: readonly string[];
  userPresetIds?: readonly string[];
}): boolean {
  const { presetId, origin, publishedPresetIds, userPresetIds = [] } = input;
  if (!presetId) return false;
  if (origin !== "visitor") return true;
  if (userPresetIds.includes(presetId)) return false;
  if (publishedPresetIds.length === 0) return false;
  return !publishedPresetIds.includes(presetId);
}

/** Client helper for boot + hydrate — clears when shouldClearLeakedVisitorPreset. */
export function clearLeakedVisitorPresetIfNeeded(
  publishedPresetIds: readonly string[],
): boolean {
  if (typeof window === "undefined") return false;
  try {
    const presetId = localStorage.getItem(PRESET_STORAGE_KEY);
    const origin = localStorage.getItem(PRESET_ORIGIN_STORAGE_KEY);
    let userPresetIds: string[] = [];
    try {
      const raw = localStorage.getItem(USER_PRESETS_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Array<{ id?: string }>;
        if (Array.isArray(parsed)) {
          userPresetIds = parsed
            .map((p) => (typeof p?.id === "string" ? p.id : ""))
            .filter(Boolean);
        }
      }
    } catch {
      userPresetIds = [];
    }
    if (
      !shouldClearLeakedVisitorPreset({
        presetId,
        origin,
        publishedPresetIds,
        userPresetIds,
      })
    ) {
      return false;
    }
    clearPresetSession();
    return true;
  } catch {
    return false;
  }
}
