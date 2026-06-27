import type { ThemeTokens } from "@/types/theme";
import { buildThemeTokenCss } from "@/lib/theme/tokens/pipeline";

export { tokensToPresetColorTokens } from "@/lib/theme/tokens/preset-colors";

/**
 * SSR-safe theme stylesheet from persisted tokens (no `document` access).
 * Delegates to the unified semantic token pipeline.
 */
export function buildThemeCss(tokens: ThemeTokens): string {
  return buildThemeTokenCss(tokens);
}

/** @deprecated Alias for `buildThemeCss` */
export const themeToCssVars = buildThemeCss;
