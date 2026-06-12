import { notFound } from "next/navigation";
import { NextIntlClientProvider } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { routing } from "@/i18n/routing";
import { isValidUrlPrefix } from "@/i18n/locale-registry.server";
import { getEnabledUrlPrefixes } from "@/i18n/locale-registry.server";
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
import { DocumentLangScript } from "@/components/layout/document-lang-script";
import { ThemeProvider } from "@/components/theme/theme-provider";
import { resolveSiteIdentityFromDb } from "@/lib/site-identity.server";
import { resolvePublishedSiteTheme } from "@/lib/theme/resolve-site-theme.server";
import { GlobalStructuredDataSync } from "@/features/seo/components/global-structured-data";
import { PersonalizationPanelLazy } from "@/components/personalization/personalization-panel-lazy";
import { MarketingPageTransition } from "@/components/motion/marketing-page-transition";
import { CatalogComparisonShell } from "@/components/comparison/catalog-comparison-shell";
import { ProductQuickViewProvider } from "@/features/products/quick-view/product-quick-view-provider";
import { ProductionHostingProbe } from "@/components/debug/production-hosting-probe";
import { AccountSessionProvider } from "@/components/account/account-session-provider";
import { loadLocaleLayoutData } from "@/features/i18n/load-locale-layout-data";
import { preloaderShowsOnInitialLoad } from "@/features/preloader/site-preloader.schema";
import { PreloaderBootScript } from "@/components/layout/preloader-boot-script";
import { PageTransitionAttributes } from "@/components/layout/page-transition-attributes";
import { PageTransitionBootScript } from "@/components/layout/page-transition-boot-script";
import { SessionDebugInstrumentation } from "@/components/debug/session-debug-instrumentation";
import { GlobalAnnouncementBar } from "@/features/announcement-bar/global-announcement-bar";
import { DeferredGlobalPopupHost } from "@/features/popups/components/deferred-global-popup-host";
import "@/styles/announcement-bar.css";
import "@/styles/popups.css";
import type { Metadata } from "next";
import "@/styles/routes/effects.css";
import "@/styles/route-loading.css";
import "@/styles/site-preloader.css";
import "@/styles/site-header-shell.css";

/** ISR: locale shell (header/footer/theme) revalidates every 5 minutes */
export const revalidate = 300;

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
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata(): Promise<Metadata> {
  try {
    const [resolved, identity] = await Promise.all([
      resolvePublishedSiteTheme(),
      resolveSiteIdentityFromDb(),
    ]);
    const iconUrl = resolved.tokens?.faviconUrl || resolved.tokens?.logoUrl;
    return {
      title: {
        default: identity.brandName,
        template: `%s | ${identity.brandName}`,
      },
      icons: iconUrl ? { icon: iconUrl } : undefined,
    };
  } catch {
    return {};
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
    validPrefix = routing.locales.includes(locale as (typeof routing.locales)[number]);
  }
  if (!validPrefix) {
    notFound();
  }

  setRequestLocale(locale);
  const {
    messages,
    shell,
    resolvedTheme,
    preloaderSettings,
    pageTransitionSettings,
    announcementBarSettings,
    popupSettings,
    htmlLang,
    comparison,
    globalStructured,
  } = await loadLocaleLayoutData(locale);

  return (
    <div className="site-shell flex min-h-full flex-col">
      <ProductionHostingProbe />
      <PreloaderBootScript
        active={
          preloaderSettings.enabled && preloaderShowsOnInitialLoad(preloaderSettings.mode)
        }
        maxDurationMs={preloaderSettings.maxDurationMs}
      />
      <PageTransitionBootScript settings={pageTransitionSettings} />
      <SessionDebugInstrumentation />
      <DocumentLangScript lang={htmlLang} dir={shell.direction} />
      <DocumentAttributes lang={htmlLang} dir={shell.direction} />
      <PageTransitionAttributes settings={pageTransitionSettings} />
      <GlobalStructuredDataSync config={globalStructured} />
      <NextIntlClientProvider locale={locale} messages={messages}>
        <AccountSessionProvider>
          <ThemeProvider resolved={resolvedTheme}>
            <DeferredNavigationProgress />
            <DeferredSitePreloaderHost settings={preloaderSettings} />
            <DeferredNavigationViewTransition />
            <DeferredRecentlyViewedTracker />
            <MotionRuntimeHost />
            <NavigationMotionLifecycle />
            <ThemePerformanceMonitorDeferred />
            <GlobalAnnouncementBar settings={announcementBarSettings} locale={locale} />
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
            <main className="site-main flex-1">
              <CatalogComparisonShell locale={locale} comparison={comparison}>
                <ProductQuickViewProvider>
                  <MarketingPageTransition>{children}</MarketingPageTransition>
                </ProductQuickViewProvider>
              </CatalogComparisonShell>
            </main>
            <FooterRenderer
              resolved={shell.resolvedFooter}
              locale={locale}
              brandConfig={shell.brandConfig}
              company={shell.company}
            />
            <DeferredGlobalPopupHost settings={popupSettings} />
            <DeferredWhatsAppFab
              phone={shell.whatsappPhone}
              message={shell.whatsappMessage}
              settings={shell.whatsappSettings.fab}
              ariaLabel={shell.whatsappAriaLabel}
            />
            <DeferredThemeToggleFab />
            <PersonalizationPanelLazy
              settings={shell.personalizationSettings}
              theme={shell.theme}
              locale={locale}
              locales={shell.enabledLocales.map((l) => ({
                code: l.code,
                urlPrefix: l.urlPrefix,
                label: l.label,
                flag: l.flag,
                isEnabled: true,
              }))}
            />
          </ThemeProvider>
        </AccountSessionProvider>
      </NextIntlClientProvider>
    </div>
  );
}
