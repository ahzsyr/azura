import type { PresetDefinition } from "@/features/theme/preset-resolver.types";

/** Computed visual tokens applied globally via CSS custom properties. */
export type PresetVisualMetrics = {
  gradientHero: string;
  gradientAccent: string;
  gradientSurface: string;
  radiusSm: string;
  radiusMd: string;
  radiusLg: string;
  radiusCard: string;
  shadowSm: string;
  shadowMd: string;
  shadowLg: string;
  shadowCard: string;
  shadowGlow: string;
  blurGlass: string;
  blurPanel: string;
  blurOverlay: string;
  glassOpacity: number;
  glassSaturation: number;
  glowColor: string;
  glowIntensity: number;
  glowSpread: string;
  borderWidth: string;
  borderGlow: string;
  particlesEnabled: boolean;
  animatedEffectsEnabled: boolean;
};

export type PresetTypography = {
  display: string;
  body: string;
  mono: string;
  scale: number;
};

export type ResolvedPresetVisual = {
  presetId: string;
  name: string;
  colors: PresetDefinition["colors"];
  cardStyle: string;
  borderStyle: string;
  backgroundEffect: string;
  textEffect: string;
  cursor: string;
  metrics: PresetVisualMetrics;
  typography: PresetTypography;
};

export type PresetVisualSnapshot = {
  presetId: string;
  cardStyle: string;
  borderStyle: string;
  backgroundEffect: string;
  textEffect: string;
  metrics: PresetVisualMetrics;
  typography: PresetTypography;
};
