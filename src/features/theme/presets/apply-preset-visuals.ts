import type { ResolvedAppearance } from "@/features/theme/engine/types";
import type { PresetVisualSnapshot, ResolvedPresetVisual } from "./preset-visual.types";

const VISUAL_VAR_KEYS = [
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

function metricsToStyleProperties(m: ResolvedPresetVisual["metrics"]): Record<string, string> {
  return {
    "--az-preset-gradient-hero": m.gradientHero,
    "--az-preset-gradient-accent": m.gradientAccent,
    "--az-preset-gradient-surface": m.gradientSurface,
    "--az-preset-radius-sm": m.radiusSm,
    "--az-preset-radius-md": m.radiusMd,
    "--az-preset-radius-lg": m.radiusLg,
    "--az-preset-radius-card": m.radiusCard,
    "--az-preset-shadow-sm": m.shadowSm,
    "--az-preset-shadow-md": m.shadowMd,
    "--az-preset-shadow-lg": m.shadowLg,
    "--az-preset-shadow-card": m.shadowCard,
    "--az-preset-shadow-glow": m.shadowGlow,
    "--az-preset-blur-glass": m.blurGlass,
    "--az-preset-blur-panel": m.blurPanel,
    "--az-preset-blur-overlay": m.blurOverlay,
    "--az-preset-glass-opacity": String(m.glassOpacity),
    "--az-preset-glass-saturation": String(m.glassSaturation),
    "--az-preset-glow-color": m.glowColor,
    "--az-preset-glow-intensity": String(m.glowIntensity),
    "--az-preset-glow-spread": m.glowSpread,
    "--az-preset-border-width": m.borderWidth,
    "--az-preset-border-glow": m.borderGlow,
    "--az-preset-shadow-ambient": "var(--az-shadow-ambient, rgb(0 0 0 / 0.35))",
  };
}

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

  const props = metricsToStyleProperties(metrics);
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

  for (const key of VISUAL_VAR_KEYS) {
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
