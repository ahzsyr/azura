import "server-only";

import { cache } from "react";
import { getMessages } from "next-intl/server";
import { getHtmlLangSync } from "@/i18n/locale-config";
import {
  resolvePreviewSiteTheme,
  resolvePublishedSiteTheme,
} from "@/lib/theme/resolve-site-theme.server";
import { buildResolvedTheme } from "@/lib/theme/theme-resolver.server";
import { readSiteSettings } from "@/features/catalog/site-settings.service";
import {
  createFallbackPublicShellContext,
  loadPublicShellContext,
} from "@/features/i18n/public-shell-context";
import { getDefaultThemeTokens } from "@/features/theme/default-theme-tokens";
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
import { seoService } from "@/features/seo/seo.service";
import type { SeoStructuredConfig } from "@/features/seo/types";

function logRecoverableLayoutError(label: string, error: unknown) {
  console.error(`[locale-layout] ${label} failed:`, error);
}

async function resolveSiteThemeWithFallback(previewDraft: boolean): Promise<ResolvedTheme> {
  try {
    return previewDraft ? await resolvePreviewSiteTheme() : await resolvePublishedSiteTheme();
  } catch (error) {
    logRecoverableLayoutError("resolveSiteTheme", error);
    return buildResolvedTheme(getDefaultThemeTokens());
  }
}

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
  globalStructured: SeoStructuredConfig | null;
};

/**
 * Single request-cached loader for the locale layout shell.
 * Fetches layout, shell, theme, settings, and comparison data in one parallel batch.
 */
export const loadLocaleLayoutData = cache(
  async (locale: string, previewDraft = false): Promise<LocaleLayoutData> => {
    const resolvedTheme = await resolveSiteThemeWithFallback(previewDraft);

    const [messages, siteSettings, shell, globalStructured] =
      await Promise.all([
        getMessages().catch((error) => {
          logRecoverableLayoutError("getMessages", error);
          return {};
        }),
        readSiteSettings(locale).catch((error) => {
          logRecoverableLayoutError("readSiteSettings", error);
          return {};
        }),
        loadPublicShellContext(locale, { themeTokens: resolvedTheme.tokens }).catch((error) => {
          logRecoverableLayoutError("loadPublicShellContext", error);
          return createFallbackPublicShellContext(locale, { themeTokens: resolvedTheme.tokens });
        }),
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
      globalStructured,
    };
  },
);
