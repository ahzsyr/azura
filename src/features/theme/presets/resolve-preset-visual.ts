import type { PresetDefinition } from "@/features/theme/preset-resolver.types";
import type { PresetVisualMetrics, PresetTypography, ResolvedPresetVisual } from "./preset-visual.types";

const PARTICLE_BACKGROUNDS = new Set([
  "particles",
  "stars",
  "matrix",
  "bubbles",
  "hexagons",
  "geometric",
  "vortex",
]);

const ANIMATED_TEXT = new Set(["neon-glow", "glitch", "gradient-flow", "scramble", "typewriter"]);

const CARD_PROFILES: Record<string, Partial<PresetVisualMetrics>> = {
  "corner-bracket": {
    radiusCard: "0.75rem",
    shadowCard: "var(--az-preset-shadow-md)",
    blurGlass: "12px",
    glassOpacity: 0.55,
  },
  glassmorphism: {
    radiusCard: "1rem",
    shadowCard: "var(--az-preset-shadow-lg)",
    blurGlass: "18px",
    blurPanel: "22px",
    glassOpacity: 0.72,
    glassSaturation: 1.35,
  },
  "liquid-glass": {
    radiusCard: "1.25rem",
    shadowCard: "0 8px 32px -8px rgb(0 0 0 / 12%)",
    blurGlass: "24px",
    blurPanel: "28px",
    blurOverlay: "16px",
    glassOpacity: 0.78,
    glassSaturation: 1.8,
    glowIntensity: 1.05,
  },
  "sharp-cut": {
    radiusCard: "0",
    radiusSm: "0",
    radiusMd: "0",
    radiusLg: "0",
    shadowCard: "0 0 24px var(--az-preset-glow-color)",
    glowIntensity: 1.2,
  },
  "thin-border": {
    radiusCard: "0.5rem",
    borderWidth: "1px",
    shadowCard: "var(--az-preset-shadow-sm)",
  },
  "soft-shadow": {
    radiusCard: "1rem",
    shadowCard: "0 12px 40px -8px var(--az-preset-shadow-ambient)",
    blurPanel: "8px",
  },
  "warm-border": {
    radiusCard: "0.85rem",
    borderWidth: "1px",
    glassOpacity: 0.65,
  },
  "slash-corner": {
    radiusCard: "0.25rem",
    shadowCard: "var(--az-preset-shadow-md)",
    glowIntensity: 1.1,
  },
};

const BORDER_PROFILES: Record<string, Partial<PresetVisualMetrics>> = {
  "neon-thin": { borderWidth: "1px", glowIntensity: 1.25, glowSpread: "0 0 12px" },
  "cyan-glow": { glowIntensity: 1.3, glowSpread: "0 0 18px" },
  "gold-thin": { borderWidth: "1px", glowIntensity: 0.9 },
  "teal-glow": { glowIntensity: 1.15, glowSpread: "0 0 14px" },
  "blue-glow": { glowIntensity: 1.2, glowSpread: "0 0 16px" },
  "indigo-glow": { glowIntensity: 1.15, glowSpread: "0 0 14px" },
  "orange-glow": { glowIntensity: 1.2, glowSpread: "0 0 16px" },
  "violet-glow": { glowIntensity: 1.25, glowSpread: "0 0 18px" },
  "amber-glow": { glowIntensity: 1.1, glowSpread: "0 0 14px" },
  "green-thin": { borderWidth: "1px", glowIntensity: 0.85 },
  "glow-red": { glowIntensity: 1.35, glowSpread: "0 0 20px" },
  "bold-green": { borderWidth: "2px", glowIntensity: 1.2 },
  "light-gray": { borderWidth: "1px", glowIntensity: 0.4 },
  "chrome-thin": { borderWidth: "1px", glassSaturation: 0.5, glowIntensity: 0.7 },
  "rose-thin": { borderWidth: "1px", glowIntensity: 0.95 },
  "gradient-border": { glowIntensity: 1.1, glowSpread: "0 0 16px" },
  "indigo-soft": { borderWidth: "1px", glowIntensity: 0.75, blurPanel: "10px" },
};

const PRESET_ID_TUNING: Record<string, Partial<PresetVisualMetrics>> = {
  luxury: { radiusCard: "0.25rem", glassOpacity: 0.5, glowIntensity: 0.85 },
  gaming: { radiusCard: "0", glowIntensity: 1.4 },
  medical: { radiusCard: "1rem", blurGlass: "8px", glassOpacity: 0.92 },
  agency: { blurGlass: "20px", glassSaturation: 1.5 },
  brt: { glowIntensity: 1.35, glowSpread: "0 0 22px" },
};

function buildGradients(colors: PresetDefinition["colors"]) {
  const { primary, accent, secondary, background, surface } = colors;
  const accentColor = accent ?? primary;
  const secondaryColor = secondary ?? accentColor;
  return {
    gradientHero: `linear-gradient(135deg, ${primary} 0%, ${secondaryColor} 45%, ${accentColor} 100%)`,
    gradientAccent: `linear-gradient(90deg, ${primary}, ${accentColor}, ${secondaryColor})`,
    gradientSurface: `linear-gradient(180deg, ${surface ?? background} 0%, color-mix(in srgb, ${background} 88%, ${primary} 12%) 100%)`,
  };
}

function defaultMetrics(colors: PresetDefinition["colors"]): PresetVisualMetrics {
  const glowColor = colors.accent ?? colors.primary;
  return {
    ...buildGradients(colors),
    radiusSm: "8px",
    radiusMd: "12px",
    radiusLg: "16px",
    radiusCard: "0.75rem",
    shadowSm: "0 1px 2px var(--az-shadow-ambient, rgb(0 0 0 / 0.2))",
    shadowMd: "0 8px 28px var(--az-shadow-ambient, rgb(0 0 0 / 0.25))",
    shadowLg: "0 20px 60px var(--az-shadow-ambient, rgb(0 0 0 / 0.35))",
    shadowCard: "var(--az-preset-shadow-md)",
    shadowGlow: `0 0 24px color-mix(in srgb, ${glowColor} 35%, transparent)`,
    blurGlass: "14px",
    blurPanel: "18px",
    blurOverlay: "10px",
    glassOpacity: 0.6,
    glassSaturation: 1.2,
    glowColor,
    glowIntensity: 1,
    glowSpread: "0 0 16px",
    borderWidth: "1px",
    borderGlow: `color-mix(in srgb, ${colors.primary} 28%, transparent)`,
    particlesEnabled: false,
    animatedEffectsEnabled: false,
  };
}

function mergeMetrics(
  base: PresetVisualMetrics,
  ...layers: Array<Partial<PresetVisualMetrics> | undefined>
): PresetVisualMetrics {
  return layers.reduce<PresetVisualMetrics>(
    (acc, layer) => (layer ? { ...acc, ...layer } : acc),
    { ...base },
  );
}

export function resolvePresetVisual(preset: PresetDefinition): ResolvedPresetVisual {
  const cardStyle = preset.cardStyle ?? "corner-bracket";
  const borderStyle = preset.borderStyle ?? "neon-thin";
  const backgroundEffect = preset.backgroundEffect ?? "none";
  const textEffect = preset.textEffect ?? "none";
  const cursor = preset.cursor ?? "default";

  const base = defaultMetrics(preset.colors);
  const metrics = mergeMetrics(
    base,
    CARD_PROFILES[cardStyle],
    BORDER_PROFILES[borderStyle],
    PRESET_ID_TUNING[preset.id],
    {
      particlesEnabled: PARTICLE_BACKGROUNDS.has(backgroundEffect),
      animatedEffectsEnabled:
        PARTICLE_BACKGROUNDS.has(backgroundEffect) ||
        ANIMATED_TEXT.has(textEffect) ||
        ["aurora", "waves", "circuit"].includes(backgroundEffect),
      borderGlow: `color-mix(in srgb, ${preset.colors.primary} 32%, transparent)`,
      glowColor: preset.colors.accent ?? preset.colors.primary,
    },
  );

  const fonts = preset.fonts ?? {
    display: "Inter",
    body: "Inter",
    mono: "JetBrains Mono",
  };

  const typography: PresetTypography = {
    display: fonts.display,
    body: fonts.body,
    mono: fonts.mono,
    scale: cardStyle === "sharp-cut" || preset.id === "gaming" ? 1.02 : 1,
  };

  return {
    presetId: preset.id,
    name: preset.name,
    colors: preset.colors,
    cardStyle,
    borderStyle,
    backgroundEffect,
    textEffect,
    cursor,
    metrics,
    typography,
  };
}

type SyntheticVisualInput = {
  cardStyle: string | null;
  borderStyle: string | null;
  primaryColor: string;
  secondaryColor?: string | null;
  accentColor?: string | null;
};

/** Client-side preset visual when industry preset JSON is not loaded. */
export function resolveSyntheticPresetVisual(
  input: SyntheticVisualInput,
): ResolvedPresetVisual | null {
  const cardStyle = input.cardStyle ?? "";
  if (!cardStyle || (!CARD_PROFILES[cardStyle] && !BORDER_PROFILES[input.borderStyle ?? ""])) {
    if (!cardStyle) return null;
  }

  const colors = {
    primary: input.primaryColor,
    secondary: input.secondaryColor ?? input.primaryColor,
    accent: input.accentColor ?? input.primaryColor,
    background: "#0a0a0a",
    surface: "#141414",
  };

  const base = defaultMetrics(colors);
  const metrics = mergeMetrics(
    base,
    CARD_PROFILES[cardStyle],
    BORDER_PROFILES[input.borderStyle ?? ""] ?? undefined,
    {
      borderGlow: `color-mix(in srgb, ${colors.primary} 32%, transparent)`,
      glowColor: colors.accent,
    },
  );

  return {
    presetId: "synthetic",
    name: "Preview",
    colors,
    cardStyle: cardStyle || "corner-bracket",
    borderStyle: input.borderStyle ?? "neon-thin",
    backgroundEffect: "none",
    textEffect: "none",
    cursor: "default",
    metrics,
    typography: {
      display: "Inter",
      body: "Inter",
      mono: "JetBrains Mono",
      scale: 1,
    },
  };
}
