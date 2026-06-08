import type { ThemeTokens } from "@/types/theme";
import { resolveThemeSurfaces } from "@/features/theme/surfaces/theme-surfaces";
import { buildAliasCss } from "./aliases";
import { buildMotionCss } from "./motion";
import { tokensToPresetColorTokens } from "./preset-colors";
import { buildSemanticCss, resolveSemanticTheme } from "./semantic";
import { buildSpacingCss } from "./spacing";
import { buildTypographyCss } from "./typography";
import { resolveThemeColors } from "@/features/theme/theme-config";

/**
 * Unified token pipeline — semantic tokens first, then aliases, typography, spacing, motion.
 */
export function buildThemeTokenCss(tokens: ThemeTokens): string {
  const semantic = resolveSemanticTheme(tokens);
  const { primary } = resolveThemeColors(tokens);
  const presetColors = tokensToPresetColorTokens(tokens);
  const surfaces = {
    light: resolveThemeSurfaces(presetColors, "light", primary),
    dark: resolveThemeSurfaces(presetColors, "dark", primary),
  };

  return [
    buildSemanticCss(semantic, surfaces),
    buildAliasCss(),
    buildTypographyCss(tokens),
    buildSpacingCss(tokens),
    buildMotionCss(tokens),
    tokens.customCss ?? "",
  ]
    .filter(Boolean)
    .join("\n");
}

export { resolveSemanticTheme } from "./semantic";
