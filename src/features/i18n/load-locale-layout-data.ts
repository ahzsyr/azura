import "server-only";

import { cache } from "react";
import { getMessages } from "next-intl/server";
import { getHtmlLangSync } from "@/i18n/locale-config";
import { resolvePublishedSiteTheme } from "@/lib/theme/resolve-site-theme.server";
import { readSiteSettings } from "@/features/catalog/site-settings.service";
import { loadPublicShellContext } from "@/features/i18n/public-shell-context";
import { loadComparisonShellProps } from "@/features/comparison/load-comparison-shell-props";
import { resolveSitePreloader } from "@/features/preloader/resolve-site-preloader";
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
  htmlLang: string;
  comparison: ComparisonShellProps;
};

/**
 * Single request-cached loader for the locale layout shell.
 * Fetches layout, shell, theme, settings, and comparison data in one parallel batch.
 */
export const loadLocaleLayoutData = cache(
  async (locale: string): Promise<LocaleLayoutData> => {
    const [messages, siteSettings, resolvedTheme, shell, comparison] = await Promise.all([
      getMessages(),
      readSiteSettings(locale),
      resolvePublishedSiteTheme(),
      loadPublicShellContext(locale),
      loadComparisonShellProps(locale),
    ]);

    const preloaderSettings = resolveSitePreloader(siteSettings, {
      themeLogoUrl: shell.theme?.logoUrl,
    });
    const htmlLang =
      shell.htmlLang ?? getHtmlLangSync(locale, shell.enabledLocales);

    return {
      messages,
      siteSettings,
      resolvedTheme,
      shell,
      preloaderSettings,
      htmlLang,
      comparison,
    };
  },
);
