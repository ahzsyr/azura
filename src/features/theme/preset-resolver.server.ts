import "server-only";

import { readFile } from "fs/promises";
import path from "path";
import type { ThemeTokens } from "@/types/theme";
import type { PresetDefinition } from "./preset-resolver.types";

const PRESETS_DIR = path.join(process.cwd(), "src/data/presets");
const FALLBACK_PRESET_ID = "travel";

export async function loadPresetJson(id: string): Promise<PresetDefinition | null> {
  try {
    const raw = await readFile(path.join(PRESETS_DIR, `${id}.json`), "utf-8");
    return JSON.parse(raw) as PresetDefinition;
  } catch {
    return null;
  }
}

export async function resolvePresetTheme(presetId?: string | null) {
  const candidate = presetId?.trim() || FALLBACK_PRESET_ID;
  let preset = await loadPresetJson(candidate);
  let activeId = candidate;

  if (!preset) {
    preset = await loadPresetJson(FALLBACK_PRESET_ID);
    activeId = FALLBACK_PRESET_ID;
  }
  if (!preset) return null;

  return {
    activePresetId: activeId,
    primaryColor: preset.colors.primary,
    secondaryColor: preset.colors.accent ?? preset.colors.secondary ?? preset.colors.primary,
    cursorEffect: preset.cursor ?? null,
    backgroundEffect: preset.backgroundEffect ?? null,
    textEffect: preset.textEffect ?? null,
    cardStyle: preset.cardStyle ?? null,
    borderStyle: preset.borderStyle ?? null,
    colors: preset.colors,
    fonts: preset.fonts,
    name: preset.name,
  };
}

export async function enrichTokensWithPreset(tokens: ThemeTokens): Promise<ThemeTokens> {
  if (!tokens.activePresetId) return tokens;
  const preset = await loadPresetJson(tokens.activePresetId);
  if (!preset) return tokens;
  return {
    ...tokens,
    presetColors: {
      primary: preset.colors.primary,
      accent: preset.colors.accent ?? preset.colors.primary,
      background: preset.colors.background,
      surface: preset.colors.surface,
      text: preset.colors.text,
      textMuted: preset.colors.textMuted,
      secondary: preset.colors.secondary,
    },
    cardStyle: tokens.cardStyle ?? preset.cardStyle ?? null,
    borderStyle: tokens.borderStyle ?? preset.borderStyle ?? null,
  };
}
