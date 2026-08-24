import type { PresetVisualMetrics } from "@/features/theme/presets/preset-visual.types";

/** Canonical CSS custom properties for preset visual metrics (single source of truth). */
export const PRESET_METRICS_CSS_KEYS = [
  "--az-preset-gradient-hero",
  "--az-preset-gradient-accent",
  "--az-preset-gradient-surface",
  "--az-preset-radius-sm",
  "--az-preset-radius-md",
  "--az-preset-radius-lg",
  "--az-preset-radius-card",
  "--az-preset-shadow-sm",
  "--az-preset-shadow-md",
  "--az-preset-shadow-lg",
  "--az-preset-shadow-card",
  "--az-preset-shadow-glow",
  "--az-preset-blur-glass",
  "--az-preset-blur-panel",
  "--az-preset-blur-overlay",
  "--az-preset-glass-opacity",
  "--az-preset-glass-saturation",
  "--az-preset-glow-color",
  "--az-preset-glow-intensity",
  "--az-preset-glow-spread",
  "--az-preset-border-width",
  "--az-preset-border-glow",
  "--az-preset-shadow-ambient",
] as const;

const METRIC_FIELD_MAP: Record<
  (typeof PRESET_METRICS_CSS_KEYS)[number],
  keyof PresetVisualMetrics | "shadowAmbient"
> = {
  "--az-preset-gradient-hero": "gradientHero",
  "--az-preset-gradient-accent": "gradientAccent",
  "--az-preset-gradient-surface": "gradientSurface",
  "--az-preset-radius-sm": "radiusSm",
  "--az-preset-radius-md": "radiusMd",
  "--az-preset-radius-lg": "radiusLg",
  "--az-preset-radius-card": "radiusCard",
  "--az-preset-shadow-sm": "shadowSm",
  "--az-preset-shadow-md": "shadowMd",
  "--az-preset-shadow-lg": "shadowLg",
  "--az-preset-shadow-card": "shadowCard",
  "--az-preset-shadow-glow": "shadowGlow",
  "--az-preset-blur-glass": "blurGlass",
  "--az-preset-blur-panel": "blurPanel",
  "--az-preset-blur-overlay": "blurOverlay",
  "--az-preset-glass-opacity": "glassOpacity",
  "--az-preset-glass-saturation": "glassSaturation",
  "--az-preset-glow-color": "glowColor",
  "--az-preset-glow-intensity": "glowIntensity",
  "--az-preset-glow-spread": "glowSpread",
  "--az-preset-border-width": "borderWidth",
  "--az-preset-border-glow": "borderGlow",
  "--az-preset-shadow-ambient": "shadowAmbient",
};

/** Map preset metrics to CSS custom property values. */
export function metricsToCssVarRecord(metrics: PresetVisualMetrics): Record<string, string> {
  const record: Record<string, string> = {};
  for (const key of PRESET_METRICS_CSS_KEYS) {
    const field = METRIC_FIELD_MAP[key];
    if (field === "shadowAmbient") {
      record[key] = "var(--az-shadow-ambient, rgb(0 0 0 / 0.35))";
      continue;
    }
    const value = metrics[field];
    if (value != null) {
      record[key] = String(value);
    }
  }
  return record;
}

/** JSON-serializable key list for theme-init.js bootstrap. */
export function getPresetMetricsBootPayload(): {
  keys: readonly string[];
  fieldMap: Record<string, string>;
} {
  const fieldMap: Record<string, string> = {};
  for (const key of PRESET_METRICS_CSS_KEYS) {
    const field = METRIC_FIELD_MAP[key];
    fieldMap[key] = field === "shadowAmbient" ? "shadowAmbient" : field;
  }
  return { keys: PRESET_METRICS_CSS_KEYS, fieldMap };
}
