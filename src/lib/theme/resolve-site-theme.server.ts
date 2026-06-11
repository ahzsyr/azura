import "server-only";

import { cache } from "react";
import { themeService } from "@/features/theme/theme.service";
import { getDefaultThemeTokens } from "@/features/theme/default-theme-tokens";
import { buildResolvedTheme } from "./theme-resolver.server";
import type { ResolvedTheme } from "./theme-resolver";

/**
 * Request-scoped cached published theme resolution.
 * Root layout SSR and ThemeProvider share the same output per request.
 */
export const resolvePublishedSiteTheme = cache(async (): Promise<ResolvedTheme> => {
  try {
    const tokens = (await themeService.getPublished()) ?? getDefaultThemeTokens();
    // #region agent log
    fetch('http://127.0.0.1:7876/ingest/6e6c5bde-6579-4633-b8e0-f055b7efa2da',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'a14bff'},body:JSON.stringify({sessionId:'a14bff',runId:'build-fail-debug',hypothesisId:'D',location:'src/lib/theme/resolve-site-theme.server.ts:16',message:'resolvePublishedSiteTheme resolved tokens',data:{hasTokens:Boolean(tokens),activePresetId:tokens?.activePresetId ?? null},timestamp:Date.now()})}).catch(()=>{});
    // #endregion
    return buildResolvedTheme(tokens);
  } catch (error) {
    // #region agent log
    fetch('http://127.0.0.1:7876/ingest/6e6c5bde-6579-4633-b8e0-f055b7efa2da',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'a14bff'},body:JSON.stringify({sessionId:'a14bff',runId:'build-fail-debug',hypothesisId:'D',location:'src/lib/theme/resolve-site-theme.server.ts:20',message:'resolvePublishedSiteTheme failed',data:{name:error instanceof Error ? error.name : 'unknown',message:error instanceof Error ? error.message : String(error)},timestamp:Date.now()})}).catch(()=>{});
    // #endregion
    throw error;
  }
});

/**
 * Request-scoped cached draft/preview theme resolution.
 */
export const resolvePreviewSiteTheme = cache(async (): Promise<ResolvedTheme> => {
  const tokens =
    (await themeService.getForPreview(true)) ?? getDefaultThemeTokens();
  return buildResolvedTheme(tokens);
});
