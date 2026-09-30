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
import { resolveSitePreloader } from "@/features/preloader/resolve-site-preloader";
import { resolvePageTransitions } from "@/features/preloader/resolve-page-transitions";
import { resolveMobileBrowserTheme } from "@/lib/theme/resolve-mobile-browser-theme";
import type { ResolvedSiteAnnouncementBar } from "@/features/announcement-bar/resolve-site-announcement-bar";
import type { ResolvedSitePreloader } from "@/features/preloader/resolve-site-preloader";
import type { ResolvedPageTransitions } from "@/features/preloader/resolve-page-transitions";
import type { PublicShellContext } from "@/features/i18n/public-shell-context";
import type { ResolvedTheme } from "@/lib/theme/theme-resolver";
import {
  headerWorkspaceFingerprint,
  logRenderPropagation,
} from "@/services/publish-propagation";

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

/** Critical shell data — blocks initial HTML (messages, theme, header, footer). */
export type LocaleLayoutCriticalData = {
  messages: Awaited<ReturnType<typeof getMessages>>;
  shell: PublicShellContext;
  siteSettings: Record<string, unknown>;
  resolvedTheme: ResolvedTheme;
  preloaderSettings: ResolvedSitePreloader;
  pageTransitionSettings: ResolvedPageTransitions;
  announcementBarSettings: ResolvedSiteAnnouncementBar;
  htmlLang: string;
};

/**
 * Request-cached loader for the critical locale layout shell.
 * Tracking, popups, Meta Pixel, and search warm-up are deferred separately.
 */
export const loadLocaleLayoutData = cache(
  async (locale: string, previewDraft = false): Promise<LocaleLayoutCriticalData> => {
    const loaderStartedAt = Date.now();
    const resolvedTheme = await resolveSiteThemeWithFallback(previewDraft);

    const [messages, siteSettings, shell] = await Promise.all([
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
    ]);

    logRenderPropagation({
      renderedAt: new Date().toISOString(),
      locale,
      durationMs: Date.now() - loaderStartedAt,
      fingerprint: headerWorkspaceFingerprint(shell.headerWorkspace),
    });

    const brandConfig = shell.brandConfig ?? shell.theme?.brandConfig;
    const mobileBrowser = resolveMobileBrowserTheme(resolvedTheme.tokens);
    const preloaderSettings = resolveSitePreloader(siteSettings, {
      themeLogoUrl: shell.theme?.logoUrl,
      brandLogoLightUrl: brandConfig?.logoImageLightUrl ?? brandConfig?.logoImageUrl,
      brandLogoDarkUrl: brandConfig?.logoImageDarkUrl,
      fallbackBackgroundColor: mobileBrowser.backgroundColor,
    });
    const pageTransitionSettings = resolvePageTransitions(siteSettings);
    const announcementBarSettings = resolveSiteAnnouncementBar(siteSettings);
    const htmlLang = shell.htmlLang ?? getHtmlLangSync(locale, shell.enabledLocales);

    return {
      messages,
      siteSettings,
      resolvedTheme,
      shell,
      preloaderSettings,
      pageTransitionSettings,
      announcementBarSettings,
      htmlLang,
    };
  },
);

/** @deprecated Alias — prefer LocaleLayoutCriticalData. */
export type LocaleLayoutData = LocaleLayoutCriticalData;
