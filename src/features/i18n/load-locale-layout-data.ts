import "server-only";

import { cache } from "react";
import { getMessages } from "next-intl/server";
import { getHtmlLangSync } from "@/i18n/locale-config";
import { resolvePublishedSiteTheme } from "@/lib/theme/resolve-site-theme.server";
import { readSiteSettings } from "@/features/catalog/site-settings.service";
import { loadPublicShellContext } from "@/features/i18n/public-shell-context";
import { loadComparisonShellProps } from "@/features/comparison/load-comparison-shell-props";
import { resolveSiteAnnouncementBar } from "@/features/announcement-bar/resolve-site-announcement-bar";
import { resolveSitePopups } from "@/features/popups/resolve-site-popups";
import { resolveSitePreloader } from "@/features/preloader/resolve-site-preloader";
import { resolvePageTransitions } from "@/features/preloader/resolve-page-transitions";
import type { ResolvedSiteAnnouncementBar } from "@/features/announcement-bar/resolve-site-announcement-bar";
import type { ResolvedSitePopups } from "@/features/popups/resolve-site-popups";
import type { ResolvedSitePreloader } from "@/features/preloader/resolve-site-preloader";
import type { ResolvedPageTransitions } from "@/features/preloader/resolve-page-transitions";
import type { PublicShellContext } from "@/features/i18n/public-shell-context";
import type { ResolvedTheme } from "@/lib/theme/theme-resolver";
import type { ComparisonShellProps } from "@/features/comparison/load-comparison-shell-props";

export type LocaleLayoutData = {
  messages: Awaited<ReturnType<typeof getMessages>>;
  shell: PublicShellContext;
  siteSettings: Record<string, unknown>;
  resolvedTheme: ResolvedTheme;
  preloaderSettings: ResolvedSitePreloader;
  pageTransitionSettings: ResolvedPageTransitions;
  announcementBarSettings: ResolvedSiteAnnouncementBar;
  popupSettings: ResolvedSitePopups;
  htmlLang: string;
  comparison: ComparisonShellProps;
};

/**
 * Single request-cached loader for the locale layout shell.
 * Fetches layout, shell, theme, settings, and comparison data in one parallel batch.
 */
export const loadLocaleLayoutData = cache(
  async (locale: string): Promise<LocaleLayoutData> => {
    try {
      const resolvedTheme = await resolvePublishedSiteTheme();

      const [messages, siteSettings, shell, comparison] = await Promise.all([
        getMessages(),
        readSiteSettings(locale),
        loadPublicShellContext(locale, { themeTokens: resolvedTheme.tokens }),
        loadComparisonShellProps(locale),
      ]);

    const brandConfig = shell.brandConfig ?? shell.theme?.brandConfig;
    const preloaderSettings = resolveSitePreloader(siteSettings, {
      themeLogoUrl: shell.theme?.logoUrl,
      brandLogoLightUrl: brandConfig?.logoImageLightUrl ?? brandConfig?.logoImageUrl,
      brandLogoDarkUrl: brandConfig?.logoImageDarkUrl,
    });
    const pageTransitionSettings = resolvePageTransitions(siteSettings);
    const announcementBarSettings = resolveSiteAnnouncementBar(siteSettings);
    const popupSettings = resolveSitePopups(siteSettings);
    const htmlLang =
      shell.htmlLang ?? getHtmlLangSync(locale, shell.enabledLocales);

      // #region agent log
      fetch('http://127.0.0.1:7876/ingest/6e6c5bde-6579-4633-b8e0-f055b7efa2da',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'a14bff'},body:JSON.stringify({sessionId:'a14bff',runId:'build-fail-debug',hypothesisId:'E',location:'src/features/i18n/load-locale-layout-data.ts:62',message:'loadLocaleLayoutData succeeded',data:{locale,messagesCount:Object.keys(messages ?? {}).length,enabledLocales:shell.enabledLocales?.length ?? 0},timestamp:Date.now()})}).catch(()=>{});
      // #endregion

      return {
        messages,
        siteSettings,
        resolvedTheme,
        shell,
        preloaderSettings,
        pageTransitionSettings,
        announcementBarSettings,
        popupSettings,
        htmlLang,
        comparison,
      };
    } catch (error) {
      // #region agent log
      fetch('http://127.0.0.1:7876/ingest/6e6c5bde-6579-4633-b8e0-f055b7efa2da',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'a14bff'},body:JSON.stringify({sessionId:'a14bff',runId:'build-fail-debug',hypothesisId:'E',location:'src/features/i18n/load-locale-layout-data.ts:74',message:'loadLocaleLayoutData failed',data:{locale,name:error instanceof Error ? error.name : 'unknown',message:error instanceof Error ? error.message : String(error)},timestamp:Date.now()})}).catch(()=>{});
      // #endregion
      throw error;
    }
  },
);
