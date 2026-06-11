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
import { seoService } from "@/features/seo/seo.service";
import type { SeoStructuredConfig } from "@/features/seo/types";

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
  globalStructured: SeoStructuredConfig | null;
};

/**
 * Single request-cached loader for the locale layout shell.
 * Fetches layout, shell, theme, settings, and comparison data in one parallel batch.
 */
export const loadLocaleLayoutData = cache(
  async (locale: string): Promise<LocaleLayoutData> => {
    try {
      const resolvedTheme = await resolvePublishedSiteTheme();

      const [messages, siteSettings, shell, comparison, globalStructured] =
        await Promise.all([
          getMessages(),
          readSiteSettings(locale),
          loadPublicShellContext(locale, { themeTokens: resolvedTheme.tokens }),
          loadComparisonShellProps(locale),
          seoService.getGlobalStructured().catch(() => null),
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
      fetch('http://127.0.0.1:7300/ingest/df4ee46a-c9a3-41ec-a748-5c05bd29eec9',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'3353e0'},body:JSON.stringify({sessionId:'3353e0',runId:'pre-fix',hypothesisId:'H2',location:'src/features/i18n/load-locale-layout-data.ts:68',message:'loadLocaleLayoutData succeeded',data:{locale,messagesCount:Object.keys(messages ?? {}).length,enabledLocales:shell.enabledLocales?.length ?? 0,hasGlobalStructured:Boolean(globalStructured?.organization || globalStructured?.website)},timestamp:Date.now()})}).catch(()=>{});
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
        globalStructured,
      };
    } catch (error) {
      // #region agent log
      fetch('http://127.0.0.1:7300/ingest/df4ee46a-c9a3-41ec-a748-5c05bd29eec9',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'3353e0'},body:JSON.stringify({sessionId:'3353e0',runId:'pre-fix',hypothesisId:'H2',location:'src/features/i18n/load-locale-layout-data.ts:86',message:'loadLocaleLayoutData failed',data:{locale,name:error instanceof Error ? error.name : 'unknown',message:error instanceof Error ? error.message : String(error)},timestamp:Date.now()})}).catch(()=>{});
      // #endregion
      throw error;
    }
  },
);
