import { applyVisualEffects } from "@/features/theme/effects-runtime";
import type { ResolvedVisualExperience } from "@/features/theme/visual-experience-resolver";
import type { ThemeTokens } from "@/types/theme";
import {
  applyPresetVisuals,
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
  CursorPreference,
  PresetEffectsPayload,
  ResolvedAppearance,
  UserCreatedPreset,
} from "./types";
import { syncThemeDataAttributes } from "./appearance";

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
  if (payload.cursor) {
    body.dataset.cursor = payload.cursor;
  }
  if (payload.backgroundEffect) {
    body.dataset.bgEffect = payload.backgroundEffect;
  }
  if (payload.textEffect) {
    document.documentElement.dataset.textEffectTheme = payload.textEffect;
  }

  dispatchThemeChange({ activePresetId: payload.presetId });
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
): Promise<ApplyPresetPayload | null> {
  const res = await fetch("/api/apply-preset", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ presetId }),
  });
  if (!res.ok) return null;

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

  if (!data.colors) return null;

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
  return payload;
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
