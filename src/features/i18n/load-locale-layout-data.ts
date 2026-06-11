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
import { agentLog, agentLogError } from "@/lib/debug/agent-log";

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
      agentLog({
        location: "load-locale-layout-data.ts",
        message: "loadLocaleLayoutData succeeded",
        hypothesisId: "H1",
        data: {
          locale,
          messagesCount: Object.keys(messages ?? {}).length,
          enabledLocales: shell.enabledLocales?.length ?? 0,
        },
      });
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
      agentLogError("load-locale-layout-data.ts", error, "H1", { locale });
      // #endregion
      throw error;
    }
  },
);
