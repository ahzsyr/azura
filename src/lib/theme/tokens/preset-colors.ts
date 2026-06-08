import type { ThemeTokens } from "@/types/theme";
import type { PresetColorTokens } from "@/features/theme/engine/types";
import { resolveThemeColors } from "@/features/theme/theme-config";

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
