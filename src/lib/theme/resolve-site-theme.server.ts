import "server-only";

import { cache } from "react";
import { themeService } from "@/features/theme/theme.service";
import { getDefaultThemeTokens } from "@/features/theme/default-theme-tokens";
import { buildResolvedTheme, type ResolvedTheme } from "./theme-resolver";

/**
 * Request-scoped cached published theme resolution.
 * Root layout SSR and ThemeProvider share the same output per request.
 */
export const resolvePublishedSiteTheme = cache(async (): Promise<ResolvedTheme> => {
  const tokens = (await themeService.getPublished()) ?? getDefaultThemeTokens();
  return buildResolvedTheme(tokens);
});

/**
 * Request-scoped cached draft/preview theme resolution.
 */
export const resolvePreviewSiteTheme = cache(async (): Promise<ResolvedTheme> => {
  const tokens =
    (await themeService.getForPreview(true)) ?? getDefaultThemeTokens();
  return buildResolvedTheme(tokens);
});
