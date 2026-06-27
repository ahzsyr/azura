import type { ThemeTokens } from "@/types/theme";
import type { ResolvedSurfaces } from "@/features/theme/surfaces/theme-surfaces";
import { resolveThemeColors } from "@/features/theme/theme-config";
import { resolveThemeSurfaces } from "@/features/theme/surfaces/theme-surfaces";
import { tokensToPresetColorTokens } from "./preset-colors";
import { colorMix, toModernColor } from "./color-utils";

/** Canonical semantic CSS custom properties (single source of truth). */
export const CANONICAL_SEMANTIC_TOKENS = [
  "--background",
  "--foreground",
  "--card",
  "--primary",
  "--secondary",
  "--accent",
  "--muted",
  "--border",
  "--ring",
  "--radius",
] as const;

export type CanonicalSemanticToken = (typeof CANONICAL_SEMANTIC_TOKENS)[number];

export type SemanticTokenSet = {
  background: string;
  foreground: string;
  card: string;
  primary: string;
  secondary: string;
  accent: string;
  muted: string;
  border: string;
  ring: string;
  radius: string;
};

export type SemanticThemeInput = {
  light: SemanticTokenSet;
  dark: SemanticTokenSet;
  brand: {
    primary: string;
    accent: string;
    secondaryBrand?: string;
  };
};

function surfacesToSemantic(
  surfaces: ResolvedSurfaces,
  brand: { primary: string; accent: string },
  radius: string,
  mode: "light" | "dark",
): SemanticTokenSet {
  const secondarySurface =
    mode === "light"
      ? colorMix(surfaces.surface, surfaces.background, 88, "oklch")
      : colorMix(surfaces.surface, brand.primary, 85, "oklch");

  return {
    background: toModernColor(surfaces.background),
    foreground: toModernColor(surfaces.text),
    card: toModernColor(surfaces.surface),
    primary: toModernColor(brand.primary),
    secondary: secondarySurface,
    accent: toModernColor(brand.accent),
    muted: toModernColor(surfaces.canvasWell),
    border: surfaces.border.includes("color-mix")
      ? surfaces.border
      : toModernColor(surfaces.border),
    ring: toModernColor(brand.primary),
    radius,
  };
}

/** Build semantic token sets for light and dark from theme tokens. */
export function resolveSemanticTheme(tokens: ThemeTokens): SemanticThemeInput {
  const { primary, secondary } = resolveThemeColors(tokens);
  const presetColors = tokensToPresetColorTokens(tokens);
  const lightSurfaces = resolveThemeSurfaces(presetColors, "light", primary);
  const darkSurfaces = resolveThemeSurfaces(presetColors, "dark", primary);
  const radius = `${0.75 * tokens.spacingScale}rem`;

  return {
    brand: { primary, accent: secondary, secondaryBrand: presetColors.secondary },
    light: surfacesToSemantic(lightSurfaces, { primary, accent: secondary }, radius, "light"),
    dark: surfacesToSemantic(darkSurfaces, { primary, accent: secondary }, radius, "dark"),
  };
}

type ExtendedSemantic = SemanticTokenSet & {
  mutedForeground: string;
  primaryForeground: string;
  accentForeground: string;
  secondaryForeground: string;
};

function semanticSetToDeclarations(
  set: SemanticTokenSet,
  extras: {
    mutedForeground: string;
    primaryForeground: string;
    accentForeground: string;
    secondaryForeground: string;
  },
): string[] {
  return [
    `--background:${set.background}`,
    `--foreground:${set.foreground}`,
    `--card:${set.card}`,
    `--primary:${set.primary}`,
    `--secondary:${set.secondary}`,
    `--accent:${set.accent}`,
    `--muted:${set.muted}`,
    `--border:${set.border}`,
    `--ring:${set.ring}`,
    `--radius:${set.radius}`,
    `--muted-foreground:${extras.mutedForeground}`,
    `--primary-foreground:${extras.primaryForeground}`,
    `--accent-foreground:${extras.accentForeground}`,
    `--secondary-foreground:${extras.secondaryForeground}`,
  ];
}

function modeExtras(
  surfaces: ResolvedSurfaces,
  mode: "light" | "dark",
): Pick<ExtendedSemantic, "mutedForeground" | "primaryForeground" | "accentForeground" | "secondaryForeground"> {
  return {
    mutedForeground: toModernColor(surfaces.textMuted),
    primaryForeground: "oklch(0.985 0 0)",
    accentForeground: mode === "light" ? "oklch(0.145 0 0)" : "oklch(0.145 0 0)",
    secondaryForeground: toModernColor(surfaces.text),
  };
}

/** SSR CSS block for canonical semantic tokens only. */
export function buildSemanticCss(semantic: SemanticThemeInput, surfaces?: {
  light: ResolvedSurfaces;
  dark: ResolvedSurfaces;
}): string {
  const lightExtras = surfaces
    ? modeExtras(surfaces.light, "light")
    : {
        mutedForeground: "oklch(0.55 0 0)",
        primaryForeground: "oklch(0.985 0 0)",
        accentForeground: "oklch(0.145 0 0)",
        secondaryForeground: "oklch(0.145 0 0)",
      };
  const darkExtras = surfaces
    ? modeExtras(surfaces.dark, "dark")
    : {
        mutedForeground: "oklch(0.65 0 0)",
        primaryForeground: "oklch(0.985 0 0)",
        accentForeground: "oklch(0.145 0 0)",
        secondaryForeground: "oklch(0.92 0 0)",
      };

  const light = semanticSetToDeclarations(semantic.light, lightExtras).join(";");
  const dark = semanticSetToDeclarations(semantic.dark, darkExtras).join(";");

  return `html {
    ${light};
  }
  html.dark {
    ${dark};
  }`;
}

/** Map resolved surfaces to semantic tokens (client DOM updates). */
export function surfacesToSemanticRecord(
  surfaces: ResolvedSurfaces,
  brand: { primary: string; accent: string },
  radius: string,
  mode: "light" | "dark",
): Record<CanonicalSemanticToken, string> {
  const set = surfacesToSemantic(surfaces, brand, radius, mode);
  return {
    "--background": set.background,
    "--foreground": set.foreground,
    "--card": set.card,
    "--primary": set.primary,
    "--secondary": set.secondary,
    "--accent": set.accent,
    "--muted": set.muted,
    "--border": set.border,
    "--ring": set.ring,
    "--radius": set.radius,
  };
}
