import { Suspense } from "react";
import { notFound } from "next/navigation";
import { NextIntlClientProvider } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { isValidUrlPrefix } from "@/i18n/locale-registry.server";
import { getEnabledUrlPrefixes } from "@/i18n/locale-registry.server";
import { FALLBACK_LOCALES } from "@/i18n/locale-config";
import { isBuildWithoutDb } from "@/lib/build-db";
import { SiteHeaderShell } from "@/components/layout/site-header-shell";
import { DeferredSiteHeader } from "@/components/layout/site-header-deferred";
import { FooterRenderer } from "@/features/footer/components/FooterRenderer";
import {
  DeferredNavigationProgress,
  DeferredNavigationViewTransition,
  DeferredRecentlyViewedTracker,
  MotionRuntimeHost,
  NavigationMotionLifecycle,
  DeferredSitePreloaderHost,
  DeferredWhatsAppFab,
  DeferredThemeToggleFab,
  ThemePerformanceMonitorDeferred,
} from "@/components/layout/marketing-shell-deferred";
import { DocumentAttributes } from "@/components/layout/document-attributes";
import { LocaleBootClient } from "@/components/layout/locale-boot-client";
import { buildLocaleBootPayload } from "@/lib/locale-boot/locale-boot-payload";
import { ThemeProvider } from "@/components/theme/theme-provider";
import { resolveSiteIdentityFromDb } from "@/lib/site-identity.server";
import { resolvePublishedSiteTheme } from "@/lib/theme/resolve-site-theme.server";
import { resolveThemeColors } from "@/features/theme/theme-config";
import { StructuredDataGraph } from "@/features/seo/components/structured-data-graph";
import { PersonalizationPanelLazy } from "@/components/personalization/personalization-panel-lazy";
import { SiteChromeGate } from "@/components/layout/site-chrome-gate";
import { MarketingPageTransition } from "@/components/motion/marketing-page-transition";
import { loadLocaleLayoutData } from "@/features/i18n/load-locale-layout-data";
import { DeferredLocaleMarketingChrome } from "@/features/i18n/deferred-locale-marketing-chrome";
import { preloaderShowsOnInitialLoad } from "@/features/preloader/site-preloader.schema";
import { PreloaderBootScript } from "@/components/layout/preloader-boot-script";
import { NavigationRejectionGuard } from "@/components/layout/navigation-rejection-guard";
import { GlobalAnnouncementBar } from "@/features/announcement-bar/global-announcement-bar";
import { resolveFaviconUrl } from "@/lib/metadata/favicon-url";
import {
  buildChromeAppleWebApp,
  buildChromeViewport,
  chromeViewportFallback,
  resolveBrowserProjection,
} from "@/lib/theme/browser-chrome-projection";
import "@/styles/announcement-bar.css";
import "@/styles/popups.css";
import type { Metadata, Viewport } from "next";
import "@/styles/routes/effects.css";
import "@/styles/route-loading.css";
import "@/styles/site-preloader.css";
import "@/styles/site-header-shell.css";
import "@/features/navigation/components/header/header-builder.css";

/**
 * Dynamic locale shell — Hostinger production 500s when this segment is ISR'd
 * (beforeInteractive scripts + heavy shell). Publish invalidation still applies to
 * nested page caches; keep shell dynamic until a safe ISR path is verified.
 * Theme-preview cookie is not read here; admin preview uses Theme Studio panel.
 */
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function generateStaticParams() {
  /**
   * When DB is intentionally disabled during build (Vercel BUILD_WITHOUT_DB),
   * avoid pre-baking stale locale shells (home/preloader/header). Let runtime
   * render with live CMS + JsonStore settings on first request.
   */
  if (isBuildWithoutDb()) return [];

  try {
    const prefixes = await getEnabledUrlPrefixes();
    if (prefixes.length > 0) return prefixes.map((locale) => ({ locale }));
  } catch {
    // DB unavailable at build
  }
  return FALLBACK_LOCALES.map((locale) => ({ locale: locale.urlPrefix }));
}

export async function generateMetadata(): Promise<Metadata> {
  try {
    const [resolved, identity] = await Promise.all([
      resolvePublishedSiteTheme(),
      resolveSiteIdentityFromDb(),
    ]);
    const iconUrl = resolveFaviconUrl(resolved.tokens?.faviconUrl || resolved.tokens?.logoUrl);
    const projection = resolveBrowserProjection(resolved.tokens);

    return {
      title: {
        default: identity.brandName,
        template: `%s | ${identity.brandName}`,
      },
      icons: iconUrl
        ? {
            icon: iconUrl,
            shortcut: iconUrl,
            apple: iconUrl,
          }
        : undefined,
      appleWebApp: buildChromeAppleWebApp(projection),
      manifest: "/manifest.webmanifest",
    };
  } catch {
    return {};
  }
}

export async function generateViewport(): Promise<Viewport> {
  try {
    const resolved = await resolvePublishedSiteTheme();
    const projection = resolveBrowserProjection(resolved.tokens);

    return buildChromeViewport({
      projection,
      darkModeEnabled: resolved.config.appearance.darkModeEnabled,
    });
  } catch {
    return chromeViewportFallback();
  }
}

type Props = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
};

export default async function LocaleLayout({ children, params }: Props) {
  const { locale } = await params;

  let validPrefix = false;
  try {
    validPrefix = await isValidUrlPrefix(locale);
  } catch {
    validPrefix = FALLBACK_LOCALES.some((entry) => entry.urlPrefix === locale);
  }
  if (!validPrefix) {
    notFound();
  }

  setRequestLocale(locale);

  /** Published theme only — cookies() would force dynamic and defeat ISR. */
  const layoutData = await loadLocaleLayoutData(locale, false);

  const {
    messages,
    shell,
    resolvedTheme,
    preloaderSettings,
    pageTransitionSettings,
    announcementBarSettings,
    htmlLang,
  } = layoutData;
  const themeColors = resolveThemeColors(resolvedTheme.tokens);
  const preloaderActive =
    preloaderSettings.enabled && preloaderShowsOnInitialLoad(preloaderSettings.mode);
  const localeBootPayload = buildLocaleBootPayload({
    lang: htmlLang,
    dir: shell.direction,
    locale,
    htmlAttributes: resolvedTheme.htmlAttributes,
    cursorEffect: resolvedTheme.tokens.cursorEffect,
    primaryColor: themeColors.primary,
    accentColor: themeColors.secondary,
    pageTransitionSettings,
    preloaderActive,
    preloaderMaxMs: preloaderSettings.maxDurationMs,
  });

  return (
    <div className="site-shell flex min-h-full flex-col" dir={shell.direction}>
      <LocaleBootClient payload={localeBootPayload} />
      <PreloaderBootScript
        active={preloaderActive}
        settings={preloaderSettings}
        logoUrl={preloaderSettings.resolvedLogoUrl}
      />
      <NavigationRejectionGuard />
      <DocumentAttributes lang={htmlLang} dir={shell.direction} locale={locale} />
      <StructuredDataGraph />
      <NextIntlClientProvider locale={locale} messages={messages}>
        <ThemeProvider resolved={resolvedTheme} previewDraft={false}>
          <DeferredNavigationProgress />
          <DeferredSitePreloaderHost settings={preloaderSettings} />
          <DeferredNavigationViewTransition />
          <DeferredRecentlyViewedTracker />
          <MotionRuntimeHost />
          <NavigationMotionLifecycle />
          <ThemePerformanceMonitorDeferred />
          <GlobalAnnouncementBar
            settings={announcementBarSettings}
            locale={locale}
            enabledLocales={shell.enabledLocales}
          />
          <SiteChromeGate settings={shell.theme?.headerConfig}>
            <SiteHeaderShell
              workspace={shell.headerWorkspace}
              locale={locale}
              themePreset={shell.theme?.preset}
              headerConfig={shell.theme?.headerConfig}
            />
            <DeferredSiteHeader
              workspace={shell.headerWorkspace}
              locale={locale}
              locales={shell.enabledLocales}
              enabledLocales={shell.enabledLocales}
              themePreset={shell.theme?.preset}
              headerConfig={shell.theme?.headerConfig}
            />
          </SiteChromeGate>
          <main className="site-main flex-1">
            <MarketingPageTransition>{children}</MarketingPageTransition>
          </main>
          <SiteChromeGate settings={shell.theme?.footerConfig}>
            <FooterRenderer
              resolved={shell.resolvedFooter}
              locale={locale}
              brandConfig={shell.brandConfig}
              company={shell.company}
            />
          </SiteChromeGate>
          <DeferredWhatsAppFab
            phone={shell.whatsappPhone}
            message={shell.whatsappMessage}
            settings={shell.whatsappSettings.fab}
            ariaLabel={shell.whatsappAriaLabel}
            dir={shell.direction}
          />
          <DeferredThemeToggleFab />
          <PersonalizationPanelLazy
            settings={shell.personalizationSettings}
            theme={shell.theme}
            locale={locale}
            dir={shell.direction}
            locales={shell.enabledLocales.map((l) => ({
              code: l.code,
              urlPrefix: l.urlPrefix,
              label: l.label,
              flag: l.flag,
              isEnabled: true,
            }))}
          />
          <Suspense fallback={null}>
            <DeferredLocaleMarketingChrome locale={locale} />
          </Suspense>
        </ThemeProvider>
      </NextIntlClientProvider>
    </div>
  );
}
