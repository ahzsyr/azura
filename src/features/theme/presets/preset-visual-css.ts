import type { ResolvedPresetVisual } from "./preset-visual.types";

/** Server-safe CSS block for published site theme (SSR first paint). */
export function presetVisualToCssBlock(visual: ResolvedPresetVisual): string {
  const m = visual.metrics;
  const t = visual.typography;
  return `:root, html {
  --az-preset-gradient-hero: ${m.gradientHero};
  --az-preset-gradient-accent: ${m.gradientAccent};
  --az-preset-gradient-surface: ${m.gradientSurface};
  --az-preset-radius-sm: ${m.radiusSm};
  --az-preset-radius-md: ${m.radiusMd};
  --az-preset-radius-lg: ${m.radiusLg};
  --az-preset-radius-card: ${m.radiusCard};
  --az-preset-shadow-sm: ${m.shadowSm};
  --az-preset-shadow-md: ${m.shadowMd};
  --az-preset-shadow-lg: ${m.shadowLg};
  --az-preset-shadow-card: ${m.shadowCard};
  --az-preset-shadow-glow: ${m.shadowGlow};
  --az-preset-blur-glass: ${m.blurGlass};
  --az-preset-blur-panel: ${m.blurPanel};
  --az-preset-blur-overlay: ${m.blurOverlay};
  --az-preset-glass-opacity: ${m.glassOpacity};
  --az-preset-glass-saturation: ${m.glassSaturation};
  --az-preset-glow-color: ${m.glowColor};
  --az-preset-glow-intensity: ${m.glowIntensity};
  --az-preset-glow-spread: ${m.glowSpread};
  --az-preset-border-width: ${m.borderWidth};
  --az-preset-border-glow: ${m.borderGlow};
  --az-font-display: '${t.display}', sans-serif;
  --az-font-body: '${t.body}', sans-serif;
  --az-font-mono: '${t.mono}', monospace;
  --font-display: var(--az-font-display);
  --font-body: var(--az-font-body);
  --font-mono: var(--az-font-mono);
  --font-heading: var(--az-font-display);
}`;
}
