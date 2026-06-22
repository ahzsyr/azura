import type { ResolvedAppearance } from "@/features/theme/engine/types";
import {
  metricsToCssVarRecord,
  PRESET_METRICS_CSS_KEYS,
} from "@/lib/theme/preset-metrics";
import type { PresetVisualSnapshot, ResolvedPresetVisual } from "./preset-visual.types";

export function toVisualSnapshot(visual: ResolvedPresetVisual): PresetVisualSnapshot {
  return {
    presetId: visual.presetId,
    cardStyle: visual.cardStyle,
    borderStyle: visual.borderStyle,
    backgroundEffect: visual.backgroundEffect,
    textEffect: visual.textEffect,
    metrics: visual.metrics,
    typography: visual.typography,
  };
}

export function applyPresetVisuals(
  visual: ResolvedPresetVisual,
  _resolvedAppearance: ResolvedAppearance = "dark",
): void {
  if (typeof document === "undefined") return;

  const html = document.documentElement;
  const { metrics, typography } = visual;

  html.dataset.cardStyle = visual.cardStyle;
  html.dataset.borderStyle = visual.borderStyle;
  html.dataset.presetId = visual.presetId;
  html.dataset.presetBackground = visual.backgroundEffect;
  html.dataset.presetParticles = metrics.particlesEnabled ? "on" : "off";
  html.dataset.presetAnimated = metrics.animatedEffectsEnabled ? "on" : "off";
  html.dataset.presetTextEffect = visual.textEffect;

  const props = metricsToCssVarRecord(metrics);
  for (const [key, value] of Object.entries(props)) {
    html.style.setProperty(key, value);
  }

  html.style.setProperty("--az-font-display", `'${typography.display}', sans-serif`);
  html.style.setProperty("--az-font-body", `'${typography.body}', sans-serif`);
  html.style.setProperty("--az-font-mono", `'${typography.mono}', monospace`);
  html.style.setProperty("--font-display", `var(--az-font-display)`);
  html.style.setProperty("--font-body", `var(--az-font-body)`);
  html.style.setProperty("--font-mono", `var(--az-font-mono)`);
  html.style.setProperty("--font-heading", `var(--az-font-display)`);
  html.style.setProperty("--az-preset-font-scale", String(typography.scale));

  html.style.setProperty("--radius", metrics.radiusCard);
}

export function applyVisualSnapshot(
  snapshot: PresetVisualSnapshot,
  resolvedAppearance: ResolvedAppearance = "dark",
): void {
  applyPresetVisuals(
    {
      presetId: snapshot.presetId,
      name: snapshot.presetId,
      colors: {
        primary: "#000",
        background: "#000",
      },
      cardStyle: snapshot.cardStyle,
      borderStyle: snapshot.borderStyle,
      backgroundEffect: snapshot.backgroundEffect,
      textEffect: snapshot.textEffect,
      cursor: "default",
      metrics: snapshot.metrics,
      typography: snapshot.typography,
    },
    resolvedAppearance,
  );
}

export function clearPresetVisualOverrides(): void {
  if (typeof document === "undefined") return;
  const html = document.documentElement;

  for (const key of PRESET_METRICS_CSS_KEYS) {
    html.style.removeProperty(key);
  }
  html.style.removeProperty("--az-preset-font-scale");

  delete html.dataset.presetId;
  delete html.dataset.presetBackground;
  delete html.dataset.presetParticles;
  delete html.dataset.presetAnimated;
  delete html.dataset.presetTextEffect;
  delete html.dataset.borderStyle;
}
