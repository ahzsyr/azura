import type { ThemeTokens } from "@/types/theme";
import type { PresetColorTokens } from "@/features/theme/engine/types";
import { resolveThemeColors } from "@/features/theme/theme-config";
import { resolveThemeSurfaces } from "@/features/theme/surfaces/theme-surfaces";
import { surfaceCssBlock } from "./surface-vars";
import { DEFAULT_MONO_FONT } from "./design-tokens";

function darkenHex(hex: string, amount = 0.15): string {
  const normalized = hex.replace("#", "");
  if (normalized.length !== 6) return hex;
  const r = Math.max(0, Math.floor(parseInt(normalized.slice(0, 2), 16) * (1 - amount)));
  const g = Math.max(0, Math.floor(parseInt(normalized.slice(2, 4), 16) * (1 - amount)));
  const b = Math.max(0, Math.floor(parseInt(normalized.slice(4, 6), 16) * (1 - amount)));
  return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
}

export function tokensToPresetColorTokens(tokens: ThemeTokens): PresetColorTokens {
  const { primary, secondary } = resolveThemeColors(tokens);
  const pc = tokens.presetColors;
  return {
    primary,
    accent: secondary,
    secondary: pc?.secondary ?? secondary,
    background: pc?.background,
    surface: pc?.surface,
    text: pc?.text,
    textMuted: pc?.textMuted,
  };
}

function buildSharedTypographyBlock(tokens: ThemeTokens, primary: string, accent: string): string {
  const c = tokens.typography;
  return [
    `--az-font-display:'${c.headingFont}',sans-serif`,
    `--az-font-body:'${c.bodyFont}',sans-serif`,
    `--az-font-mono:'${DEFAULT_MONO_FONT}',monospace`,
    `--font-display:var(--az-font-display)`,
    `--font-body:var(--az-font-body)`,
    `--font-mono:var(--az-font-mono)`,
    `--font-size-root:${c.baseFontSize}`,
    `--az-accent:${accent}`,
    `--az-color-primary:${primary}`,
    `--az-color-accent:${accent}`,
    `--az-color-secondary:${tokens.presetColors?.secondary ?? accent}`,
    `--az-space-xs:0.25rem`,
    `--az-space-sm:0.5rem`,
    `--az-space-md:1rem`,
    `--az-space-lg:1.5rem`,
    `--az-space-xl:2rem`,
    `--az-radius-sm:8px`,
    `--az-radius-md:12px`,
    `--az-radius-lg:16px`,
    "--az-shadow-sm:0 1px 2px var(--az-shadow-ambient)",
    "--az-shadow-md:0 8px 28px var(--az-shadow-ambient)",
    "--bg-primary:var(--az-bg-primary)",
    "--bg-secondary:var(--az-bg-secondary)",
    "--text-primary:var(--az-text-primary)",
    "--text-secondary:var(--az-text-secondary)",
    "--color-primary:var(--az-color-primary)",
    "--color-accent:var(--az-color-accent)",
    "--color-secondary:var(--az-color-secondary)",
    "--color-bg:var(--az-color-bg)",
    "--color-surface:var(--az-color-surface)",
    "--color-border:var(--az-color-border)",
    "--color-text:var(--az-color-text)",
    "--color-text-muted:var(--az-color-muted)",
    "--p:var(--az-color-primary)",
    "--a:var(--az-color-accent)",
    "--s2:var(--az-color-secondary)",
    "--bg:var(--az-bg-primary)",
    "--sur:var(--az-bg-secondary)",
    "--t:var(--az-text-primary)",
    "--m:var(--az-text-secondary)",
  ].join(";");
}

function buildMotionBlock(tokens: ThemeTokens): string {
  if (!tokens.animationsEnabled) {
    return `*, *::before, *::after {
  animation-duration: 0.01ms !important;
  animation-iteration-count: 1 !important;
  transition-duration: 0.01ms !important;
}`;
  }
  return `:root { --motion-scale: ${tokens.animationSpeed}; }`;
}

/**
 * SSR-safe theme stylesheet from persisted tokens (no `document` access).
 */
export function buildThemeCss(tokens: ThemeTokens): string {
  const { primary, secondary } = resolveThemeColors(tokens);
  const presetColors = tokensToPresetColorTokens(tokens);
  const lightSurfaces = resolveThemeSurfaces(presetColors, "light", primary);
  const darkSurfaces = resolveThemeSurfaces(presetColors, "dark", primary);
  const scale = tokens.spacingScale;
  const radius = `${0.75 * scale}rem`;
  const headingScale = tokens.typography.headingScale;

  const lightBlock = surfaceCssBlock(lightSurfaces, "light");
  const darkBlock = surfaceCssBlock(darkSurfaces, "dark");
  const sharedBlock = buildSharedTypographyBlock(tokens, primary, secondary);
  const motionCss = buildMotionBlock(tokens);

  const darkSecondary = `color-mix(in srgb, ${darkSurfaces.surface} 85%, ${primary} 15%)`;

  return `html {
  --primary: ${primary};
  --primary-foreground: #ffffff;
  --secondary: #f5f5f4;
  --secondary-foreground: #0a0a0a;
  --accent: ${secondary};
  --accent-foreground: #0a0a0a;
  --ring: ${primary};
  --gold: ${secondary};
  --emerald: ${primary};
  --emerald-dark: ${darkenHex(primary)};
  --radius: ${radius};
  --spacing-scale: ${scale};
  --animation-speed: ${tokens.animationSpeed};
  --font-body: "${tokens.typography.bodyFont}", sans-serif;
  --font-heading: "${tokens.typography.headingFont}", serif;
  --font-size-base: ${tokens.typography.baseFontSize};
  --heading-scale: ${headingScale};
  ${lightBlock};
  ${sharedBlock};
}
html.dark {
  --primary: ${primary};
  --primary-foreground: #ffffff;
  --accent: ${secondary};
  --accent-foreground: #0a0a0a;
  --ring: ${primary};
  --gold: ${secondary};
  --emerald: ${primary};
  --emerald-dark: ${darkenHex(primary)};
  --secondary: ${darkSecondary};
  --secondary-foreground: ${darkSurfaces.text};
  ${darkBlock};
}
${motionCss}
html[data-theme-spacing] .container-premium {
  padding-inline: calc(1rem * var(--spacing-scale));
}
html[data-theme-spacing] .section-padding {
  padding-block: calc(5rem * var(--spacing-scale));
}
${tokens.customCss ?? ""}`;
}

/** @deprecated Alias for `buildThemeCss` */
export const themeToCssVars = buildThemeCss;
