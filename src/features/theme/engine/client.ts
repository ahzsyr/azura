import { parseBackgroundEffectSettings } from "@/features/theme/backgrounds/settings";
import { applyVisualEffects } from "@/features/theme/effects-runtime";
import type { ResolvedVisualExperience } from "@/features/theme/visual-experience-resolver";
import type { ThemeTokens } from "@/types/theme";
import {
  applyVisualSnapshot,
  clearPresetVisualOverrides,
} from "@/features/theme/presets";
import { applyPresetColors, clearPresetColorOverrides } from "./colors";
import { dispatchThemeChange } from "./events";
import {
  clearPresetSession,
  persistPresetSession,
  readStoredPresetColors,
  readStoredPresetEffects,
  readStoredPresetVisual,
} from "./preset-session";
import type {
  ApplyPresetPayload,
  AppearanceMode,
  CatalogPresetApplyResult,
  CursorPreference,
  PresetEffectsPayload,
  ResolvedAppearance,
  UserCreatedPreset,
} from "./types";
import { CURSOR_PREF_STORAGE_KEY } from "./constants";
import { syncThemeDataAttributes } from "./appearance";

function readStoredCursorPreference(): CursorPreference {
  try {
    const pref = localStorage.getItem(CURSOR_PREF_STORAGE_KEY);
    return pref === "normal" ? "normal" : "custom";
  } catch {
    return "custom";
  }
}

function hasLiveEffects(e: PresetEffectsPayload | null): boolean {
  if (!e) return false;
  return Boolean(
    e.cursor ||
      e.backgroundEffect ||
      e.textEffect ||
      e.cardStyle ||
      e.borderStyle,
  );
}

export function buildLiveVisualExperience(
  site: ThemeTokens,
  liveEffects: PresetEffectsPayload | null,
  cursorPreference: CursorPreference,
): ResolvedVisualExperience {
  const useLive = hasLiveEffects(liveEffects);
  const cursorEnabled = site.cursorEffectEnabled !== false && cursorPreference !== "normal";
  const cursor = !cursorEnabled
    ? null
    : ((useLive ? liveEffects?.cursor : null) ?? site.cursorEffect);
  const background = (useLive ? liveEffects?.backgroundEffect : null) ?? site.backgroundEffect;
  const text = (useLive ? liveEffects?.textEffect : null) ?? site.textEffect;

  return {
    cursorEffect: cursor,
    backgroundEffect: background,
    textEffect: text,
    animationsEnabled: site.animationsEnabled,
    cardStyle: (useLive ? liveEffects?.cardStyle : null) ?? site.cardStyle ?? null,
    borderStyle:
      (useLive ? liveEffects?.borderStyle : null) ?? site.borderStyle ?? null,
    cursorEnabled,
    backgroundEnabled: site.backgroundEffectEnabled !== false,
    textEnabled: site.textEffectEnabled !== false,
    backgroundEffectSettings:
      useLive && liveEffects?.backgroundEffectSettings != null
        ? parseBackgroundEffectSettings(liveEffects.backgroundEffectSettings)
        : site.backgroundEffectSettings,
  };
}

export function applyPresetToDocument(
  payload: ApplyPresetPayload,
  resolvedAppearance: ResolvedAppearance,
): void {
  applyPresetColors(payload.colors, resolvedAppearance);
  if (payload.visual) {
    applyVisualSnapshot(payload.visual, resolvedAppearance);
  }
  persistPresetSession(payload);

  const body = document.body;
  const cursorPref = readStoredCursorPreference();
  if (payload.cursor && cursorPref !== "normal") {
    body.dataset.cursor = payload.cursor;
  } else {
    delete body.dataset.cursor;
  }
  if (payload.backgroundEffect) {
    body.dataset.bgEffect = payload.backgroundEffect;
  }
  if (payload.textEffect) {
    document.documentElement.dataset.textEffectTheme = payload.textEffect;
  }

  dispatchThemeChange({
    visitorPresetId: payload.presetId,
    effectivePresetId: payload.presetId,
  });
}

export function restorePresetColorsFromStorage(resolvedAppearance: ResolvedAppearance): boolean {
  const colors = readStoredPresetColors();
  const visual = readStoredPresetVisual();
  if (!colors && !visual) return false;
  if (colors) applyPresetColors(colors, resolvedAppearance);
  if (visual) applyVisualSnapshot(visual, resolvedAppearance);
  return true;
}

export function clearVisitorPresetOverrides(): void {
  clearPresetSession();
  clearPresetColorOverrides();
  clearPresetVisualOverrides();
}

export function applyUserPresetToDocument(
  preset: UserCreatedPreset,
  resolvedAppearance: ResolvedAppearance,
): void {
  applyPresetToDocument(
    {
      presetId: preset.id,
      name: preset.name,
      colors: preset.colors,
      cursor: preset.cursor,
      backgroundEffect: preset.backgroundEffect,
      textEffect: preset.textEffect,
      cardStyle: preset.cardStyle,
      borderStyle: preset.borderStyle,
    },
    resolvedAppearance,
  );
}

export async function fetchAndApplyCatalogPreset(
  presetId: string,
  resolvedAppearance: ResolvedAppearance,
): Promise<CatalogPresetApplyResult> {
  let res: Response;
  try {
    res = await fetch("/api/apply-preset", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ presetId }),
    });
  } catch {
    return {
      ok: false,
      status: null,
      reason: "request_failed",
      message: "Could not reach preset service. Please try again.",
    };
  }

  if (!res.ok) {
    let message = "Failed to apply preset.";
    try {
      const data = (await res.json()) as { error?: string };
      if (typeof data.error === "string" && data.error.trim()) {
        message = data.error;
      }
    } catch {
      // Ignore parse issues and keep generic message.
    }
    return {
      ok: false,
      status: res.status,
      reason: res.status === 404 ? "unavailable" : "request_failed",
      message,
    };
  }

  const data = (await res.json()) as {
    preset?: { id: string; name?: string };
    colors?: ApplyPresetPayload["colors"];
    cursor?: string | null;
    backgroundEffect?: string | null;
    textEffect?: string | null;
    cardStyle?: string | null;
    borderStyle?: string | null;
    visual?: ApplyPresetPayload["visual"];
  };

  if (!data.colors) {
    return {
      ok: false,
      status: res.status,
      reason: "request_failed",
      message: "Preset response was incomplete. Please try again.",
    };
  }

  const payload: ApplyPresetPayload = {
    presetId: data.preset?.id ?? presetId,
    name: data.preset?.name,
    colors: {
      primary: data.colors.primary,
      accent: data.colors.accent ?? data.colors.primary,
      secondary: data.colors.secondary,
      background: data.colors.background,
      surface: data.colors.surface,
      text: data.colors.text,
      textMuted: data.colors.textMuted,
    },
    cursor: data.cursor,
    backgroundEffect: data.backgroundEffect,
    textEffect: data.textEffect,
    cardStyle: data.cardStyle,
    borderStyle: data.borderStyle,
    visual: data.visual,
  };

  applyPresetToDocument(payload, resolvedAppearance);
  return { ok: true, payload };
}

export function applyLiveEffectsFromStorage(
  site: ThemeTokens,
  resolvedAppearance: ResolvedAppearance,
  cursorPreference: CursorPreference,
): ResolvedVisualExperience | null {
  restorePresetColorsFromStorage(resolvedAppearance);
  const effects = readStoredPresetEffects();
  if (!effects && !readStoredPresetColors()) return null;
  const experience = buildLiveVisualExperience(site, effects, cursorPreference);
  applyVisualEffects(experience);
  return experience;
}

export function notifyAppearanceChange(
  mode: AppearanceMode,
  resolved: ResolvedAppearance,
  options?: { appearanceOnly?: boolean },
): void {
  syncThemeDataAttributes(mode, resolved);
  dispatchThemeChange({
    appearanceMode: mode,
    resolvedAppearance: resolved,
    appearanceOnly: options?.appearanceOnly,
  });
}

/** Re-export session readers for client components (Turbopack resolves this module as the engine client entry). */
export {
  readStoredPresetColors,
  readStoredPresetEffects,
  readStoredPresetVisual,
} from "./preset-session";
