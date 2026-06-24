import {
  ADMIN_THEME_KEY,
  PRESET_COLORS_STORAGE_KEY,
  PRESET_EFFECTS_STORAGE_KEY,
  PRESET_VISUAL_STORAGE_KEY,
  PUBLIC_THEME_KEY,
} from "@/features/theme/engine/constants";
import { getPresetMetricsBootPayload } from "./preset-metrics";

/** Serializable boot payload consumed by theme-init.js before hydration. */
export type ThemeBootPayload = {
  metricsKeys: readonly string[];
  metricsFieldMap: Record<string, string>;
  storageKeys: {
    publicTheme: string;
    adminTheme: string;
    presetColors: string;
    presetVisual: string;
    presetEffects: string;
  };
};

export function buildThemeBootPayload(): ThemeBootPayload {
  const { keys, fieldMap } = getPresetMetricsBootPayload();
  return {
    metricsKeys: keys,
    metricsFieldMap: fieldMap,
    storageKeys: {
      publicTheme: PUBLIC_THEME_KEY,
      adminTheme: ADMIN_THEME_KEY,
      presetColors: PRESET_COLORS_STORAGE_KEY,
      presetVisual: PRESET_VISUAL_STORAGE_KEY,
      presetEffects: PRESET_EFFECTS_STORAGE_KEY,
    },
  };
}

/** Minimal inline script — sets window.__AZ_THEME_BOOT for theme-init.js. */
export function generateThemeBootInlineScript(): string {
  return `window.__AZ_THEME_BOOT=${JSON.stringify(buildThemeBootPayload())};`;
}
