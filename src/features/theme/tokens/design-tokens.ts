import type { ThemePreset } from "@prisma/client";
import { CANONICAL_SEMANTIC_TOKENS } from "@/lib/theme/tokens/semantic";

/** Canonical semantic token names (see `src/lib/theme/tokens/semantic.ts`). */
export { CANONICAL_SEMANTIC_TOKENS };

/**
 * CSS custom property names — canonical semantic + legacy aliases for SSR/client.
 */
export const DESIGN_TOKEN_VARS = {
  primary: "--primary",
  primaryForeground: "--primary-foreground",
  secondary: "--secondary",
  secondaryForeground: "--secondary-foreground",
  accent: "--accent",
  accentForeground: "--accent-foreground",
  background: "--background",
  foreground: "--foreground",
  card: "--card",
  muted: "--muted",
  mutedForeground: "--muted-foreground",
  border: "--border",
  ring: "--ring",
  radius: "--radius",
  spacingScale: "--spacing-scale",
  animationSpeed: "--animation-speed",
  motionScale: "--motion-scale",
  fontBody: "--font-body",
  fontHeading: "--font-heading",
  fontSizeBase: "--font-size-base",
  headingScale: "--heading-scale",
  azBgPrimary: "--az-bg-primary",
  azBgSecondary: "--az-bg-secondary",
  azTextPrimary: "--az-text-primary",
  azTextSecondary: "--az-text-secondary",
  azColorPrimary: "--az-color-primary",
  azColorAccent: "--az-color-accent",
  azColorSurface: "--az-color-surface",
  azBorderSubtle: "--az-border-subtle",
} as const;

export type DesignTokenVar = (typeof DESIGN_TOKEN_VARS)[keyof typeof DESIGN_TOKEN_VARS];

export const THEME_PRESET_DEFAULTS: Record<
  ThemePreset,
  { primaryColor: string; secondaryColor: string }
> = {
  CLASSIC: { primaryColor: "#047857", secondaryColor: "#d4af37" },
  MODERN: { primaryColor: "#0f766e", secondaryColor: "#f59e0b" },
  LUXURY: { primaryColor: "#1a1a1a", secondaryColor: "#c9a227" },
  CUSTOM: { primaryColor: "#047857", secondaryColor: "#d4af37" },
};

export const DEFAULT_THEME_COLORS = {
  primary: THEME_PRESET_DEFAULTS.CLASSIC.primaryColor,
  secondary: THEME_PRESET_DEFAULTS.CLASSIC.secondaryColor,
} as const;

export const DEFAULT_TYPOGRAPHY = {
  bodyFont: "Plus Jakarta Sans",
  headingFont: "Amiri",
  baseFontSize: "16px",
  headingScale: 1.25,
} as const;

export const DEFAULT_MONO_FONT = "JetBrains Mono";
