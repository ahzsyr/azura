import type { ThemeTokens } from "@/types/theme";
import { resolveThemeSurfaces } from "@/features/theme/surfaces/theme-surfaces";
import { resolveThemeColors } from "@/features/theme/theme-config";
import {
  resolveSemanticTheme,
  type SemanticTokenSet,
} from "@/lib/theme/tokens/semantic";
import { tokensToPresetColorTokens } from "@/lib/theme/tokens/preset-colors";
import { toModernColor } from "@/lib/theme/tokens/color-utils";
import type { ResolvedSurfaces } from "@/features/theme/surfaces/theme-surfaces";

function modeExtras(
  surfaces: ResolvedSurfaces,
  mode: "light" | "dark",
): {
  mutedForeground: string;
  primaryForeground: string;
  accentForeground: string;
  secondaryForeground: string;
} {
  return {
    mutedForeground: toModernColor(surfaces.textMuted),
    primaryForeground: "oklch(0.985 0 0)",
    accentForeground: mode === "light" ? "oklch(0.145 0 0)" : "oklch(0.145 0 0)",
    secondaryForeground: toModernColor(surfaces.text),
  };
}

function semanticToBlock(set: SemanticTokenSet, extras: ReturnType<typeof modeExtras>): string {
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
    `--card-foreground:${set.foreground}`,
    `--input:${set.border}`,
  ].join(";");
}

/** Brand colors + typography scoped to admin shell (no global html overrides). */
export function buildAdminShellThemeCss(tokens: ThemeTokens): string {
  const semantic = resolveSemanticTheme(tokens);
  const { primary } = resolveThemeColors(tokens);
  const presetColors = tokensToPresetColorTokens(tokens);
  const lightSurfaces = resolveThemeSurfaces(presetColors, "light", primary);
  const darkSurfaces = resolveThemeSurfaces(presetColors, "dark", primary);
  const lightExtras = modeExtras(lightSurfaces, "light");
  const darkExtras = modeExtras(darkSurfaces, "dark");
  const c = tokens.typography;
  const headingFont =
    typeof c.headingFont === "string" && c.headingFont.trim() ? c.headingFont : "Amiri";
  const bodyFont =
    typeof c.bodyFont === "string" && c.bodyFont.trim() ? c.bodyFont : "Plus Jakarta Sans";
  if (headingFont !== c.headingFont || bodyFont !== c.bodyFont) {
  }

  const lightBlock = semanticToBlock(semantic.light, lightExtras);
  const darkBlock = semanticToBlock(semantic.dark, darkExtras);

  return `@layer tokens {
  .admin-shell {
    ${lightBlock};
    --font-display:'${headingFont.replace(/'/g, "\\'")}',sans-serif;
    --font-body:'${bodyFont.replace(/'/g, "\\'")}',sans-serif;
    --font-heading:var(--font-display);
    --font-size-root:${c.baseFontSize};
    --font-size-base:${c.baseFontSize};
    --heading-scale:${c.headingScale};
    --admin-canvas:color-mix(in oklch,var(--background) 92%,var(--primary) 8%);
    --admin-surface:var(--card);
    --admin-border:color-mix(in oklch,var(--border) 85%,var(--primary) 15%);
    --admin-input-bg:color-mix(in oklch,var(--card) 96%,var(--background) 4%);
    --admin-label:var(--muted-foreground);
  }
  html.dark .admin-shell {
    ${darkBlock};
    --admin-canvas:color-mix(in oklch,var(--background) 94%,var(--primary) 6%);
    --admin-input-bg:color-mix(in oklch,var(--card) 98%,var(--background) 2%);
  }
}`;
}
