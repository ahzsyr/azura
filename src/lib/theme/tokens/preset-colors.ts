import type { ThemeTokens } from "@/types/theme";
import type { PresetColorTokens } from "@/features/theme/engine/types";
import { resolveThemeColors } from "@/features/theme/theme-config";
import { coerceColorString } from "@/lib/theme/tokens/color-utils";

function sanitizePresetColorTokens(
  colors: PresetColorTokens,
): PresetColorTokens {
  const primary = coerceColorString(colors.primary);
  const accent = coerceColorString(colors.accent);
  const sanitized: PresetColorTokens = {
    primary: primary ?? "#0066cc",
    accent: accent ?? primary ?? "#0066cc",
  };
  const optionalKeys = ["secondary", "background", "surface", "text", "textMuted"] as const;
  for (const key of optionalKeys) {
    const value = colors[key];
    const coerced = coerceColorString(value);
    if (coerced) sanitized[key] = coerced;
    else if (value != null && typeof value !== "string") {
      // #region agent log
      console.error(
        `[debug-6d71f4] sanitizePresetColorTokens: dropped non-string`,
        JSON.stringify({ key, receivedType: typeof value }),
      );
      // #endregion
    }
  }
  return sanitized;
}

export function tokensToPresetColorTokens(tokens: ThemeTokens): PresetColorTokens {
  const { primary, secondary } = resolveThemeColors(tokens);
  const pc = tokens.presetColors;
  return sanitizePresetColorTokens({
    primary,
    accent: secondary,
    secondary: pc?.secondary ?? secondary,
    background: pc?.background,
    surface: pc?.surface,
    text: pc?.text,
    textMuted: pc?.textMuted,
  });
}
