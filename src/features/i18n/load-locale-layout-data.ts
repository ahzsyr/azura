import "server-only";

import { cache } from "react";
import { getMessages } from "next-intl/server";
import { getHtmlLangSync } from "@/i18n/locale-config";
import { resolvePublishedSiteTheme } from "@/lib/theme/resolve-site-theme.server";
import { readSiteSettings } from "@/features/catalog/site-settings.service";
import { loadPublicShellContext } from "@/features/i18n/public-shell-context";
import { loadComparisonShellProps } from "@/features/comparison/load-comparison-shell-props";
import { resolveSiteAnnouncementBar } from "@/features/announcement-bar/resolve-site-announcement-bar";
import { resolveSitePreloader } from "@/features/preloader/resolve-site-preloader";
import type { ResolvedSiteAnnouncementBar } from "@/features/announcement-bar/resolve-site-announcement-bar";
import type { ResolvedSitePreloader } from "@/features/preloader/resolve-site-preloader";
import type { PublicShellContext } from "@/features/i18n/public-shell-context";
import type { ResolvedTheme } from "@/lib/theme/theme-resolver";
import type { ComparisonShellProps } from "@/features/comparison/load-comparison-shell-props";

export type LocaleLayoutData = {
  messages: Awaited<ReturnType<typeof getMessages>>;
  shell: PublicShellContext;
  siteSettings: Record<string, unknown>;
  resolvedTheme: ResolvedTheme;
  preloaderSettings: ResolvedSitePreloader;
  announcementBarSettings: ResolvedSiteAnnouncementBar;
  htmlLang: string;
  comparison: ComparisonShellProps;
};

/**
 * Single request-cached loader for the locale layout shell.
 * Fetches layout, shell, theme, settings, and comparison data in one parallel batch.
 */
export const loadLocaleLayoutData = cache(
  async (locale: string): Promise<LocaleLayoutData> => {
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
    const announcementBarSettings = resolveSiteAnnouncementBar(siteSettings);
    const htmlLang =
      shell.htmlLang ?? getHtmlLangSync(locale, shell.enabledLocales);

    return {
      messages,
      siteSettings,
      resolvedTheme,
      shell,
      preloaderSettings,
      announcementBarSettings,
      htmlLang,
      comparison,
    };
  },
);
