import type { ThemeTokens } from "@/types/theme";
import { surfaceCssBlock } from "@/features/theme/tokens/surface-vars";
import {
  isLightBackground,
  resolveThemeSurfaces,
} from "@/features/theme/surfaces/theme-surfaces";
import { buildAliasDeclarations } from "./aliases";
import { buildMotionCss } from "./motion";
import { tokensToPresetColorTokens } from "./preset-colors";
import { buildSpacingCss } from "./spacing";
import { buildTypographyCss } from "./typography";
import { resolveThemeColors } from "@/features/theme/theme-config";
import { DEFAULT_MONO_FONT } from "@/features/theme/tokens/design-tokens";
import { coerceColorString } from "@/lib/theme/tokens/color-utils";

function darkenHex(hex: string, amount = 0.15): string {
  const color = coerceColorString(hex);
  if (!color) {
    return "#000000";
  }
  const normalized = color.replace("#", "");
  if (normalized.length !== 6) return color;
  const r = Math.max(0, Math.floor(parseInt(normalized.slice(0, 2), 16) * (1 - amount)));
  const g = Math.max(0, Math.floor(parseInt(normalized.slice(2, 4), 16) * (1 - amount)));
  const b = Math.max(0, Math.floor(parseInt(normalized.slice(4, 6), 16) * (1 - amount)));
  return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
}

function buildSharedTypographyBlock(tokens: ThemeTokens, primary: string, accent: string): string {
  const c = tokens.typography;
  const secondaryBrand = tokens.presetColors?.secondary ?? accent;
  return [
    `--az-font-display:'${c.headingFont}',sans-serif`,
    `--az-font-body:'${c.bodyFont}',sans-serif`,
    `--az-font-mono:'${DEFAULT_MONO_FONT}',monospace`,
    `--font-display:var(--az-font-display)`,
    `--font-body:var(--az-font-body)`,
    `--font-mono:var(--az-font-mono)`,
    `--font-size-root:${c.baseFontSize}`,
    `--font-size-base:${c.baseFontSize}`,
    `--heading-scale:${c.headingScale}`,
    `--az-accent:${accent}`,
    `--az-color-primary:${primary}`,
    `--az-color-accent:${accent}`,
    `--az-color-secondary:${secondaryBrand}`,
  ].join(";");
}

/** Unlayered html / html.dark blocks — learn parity with hex surface vars. */
function buildUnifiedSurfaceCss(
  tokens: ThemeTokens,
  surfaces: { light: ReturnType<typeof resolveThemeSurfaces>; dark: ReturnType<typeof resolveThemeSurfaces> },
): string {
  const { primary, secondary } = resolveThemeColors(tokens);
  const radius = `${0.75 * tokens.spacingScale}rem`;
  const scale = tokens.spacingScale;
  const aliases = buildAliasDeclarations().join(";");
  const lightSurface = surfaceCssBlock(surfaces.light, "light");
  const darkSurface = surfaceCssBlock(surfaces.dark, "dark");
  const darkSecondary = `color-mix(in srgb, ${surfaces.dark.surface} 85%, ${primary} 15%)`;
  const shared = buildSharedTypographyBlock(tokens, primary, secondary);
  const primaryForeground = isLightBackground(primary) ? "#0a0a0a" : "#ffffff";
  const accentForeground = isLightBackground(secondary) ? "#0a0a0a" : "#ffffff";

  return `html {
  --primary:${primary};
  --primary-foreground:${primaryForeground};
  --secondary:#f5f5f4;
  --secondary-foreground:#0a0a0a;
  --accent:${secondary};
  --accent-foreground:${accentForeground};
  --ring:${primary};
  --gold:${secondary};
  --emerald:${primary};
  --emerald-dark:${darkenHex(primary)};
  --radius:${radius};
  --spacing-scale:${scale};
  --animation-speed:${tokens.animationSpeed};
  --font-body:"${tokens.typography.bodyFont}",sans-serif;
  --font-heading:"${tokens.typography.headingFont}",serif;
  ${lightSurface};
  ${shared};
  ${aliases};
}
html.dark {
  --primary:${primary};
  --primary-foreground:${primaryForeground};
  --accent:${secondary};
  --accent-foreground:${accentForeground};
  --ring:${primary};
  --gold:${secondary};
  --emerald:${primary};
  --emerald-dark:${darkenHex(primary)};
  --secondary:${darkSecondary};
  --secondary-foreground:${surfaces.dark.text};
  ${darkSurface};
  ${aliases};
}`;
}

/**
 * Unified token pipeline — unlayered surface blocks, typography, spacing, motion.
 */
export function buildThemeTokenCss(tokens: ThemeTokens): string {
  const { primary } = resolveThemeColors(tokens);
  const presetColors = tokensToPresetColorTokens(tokens);
  const surfaces = {
    light: resolveThemeSurfaces(presetColors, "light", primary),
    dark: resolveThemeSurfaces(presetColors, "dark", primary),
  };

  return [
    buildUnifiedSurfaceCss(tokens, surfaces),
    buildTypographyCss(tokens),
    buildSpacingCss(tokens),
    buildMotionCss(tokens),
    tokens.customCss ?? "",
  ]
    .filter(Boolean)
    .join("\n");
}

export { resolveSemanticTheme } from "./semantic";
