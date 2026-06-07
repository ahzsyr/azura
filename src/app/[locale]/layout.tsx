import { notFound } from "next/navigation";
import { NextIntlClientProvider } from "next-intl";
import { getMessages, setRequestLocale } from "next-intl/server";
import { routing } from "@/i18n/routing";
import { getHtmlLangSync } from "@/i18n/locale-config";
import { getEnabledUrlPrefixes, isValidUrlPrefix } from "@/i18n/locale-registry.server";
import { SiteHeader } from "@/components/layout/site-header";
import { FooterRenderer } from "@/features/footer/components/FooterRenderer";
import { WhatsAppFab } from "@/components/layout/whatsapp-fab";
import { DocumentAttributes } from "@/components/layout/document-attributes";
import { ThemeProvider } from "@/components/theme/theme-provider";
import { themeService } from "@/features/theme/theme.service";
import { GlobalStructuredData } from "@/features/seo/components/global-structured-data";
import { PersonalizationPanelLazy } from "@/components/personalization/personalization-panel-lazy";
import { ScrollRevealObserver } from "@/components/motion/scroll-reveal-observer";
import { MarketingPageTransition } from "@/components/motion/marketing-page-transition";
import { CatalogComparisonShell } from "@/components/comparison/catalog-comparison-shell";
import { RecentlyViewedTracker } from "@/features/discovery-blocks/components/recently-viewed-tracker";
import { GoogleAnalytics } from "@/components/analytics/google-analytics";
import { AccountSessionProvider } from "@/components/account/account-session-provider";
import { loadPublicShellContext } from "@/features/i18n/public-shell-context";
import type { Metadata } from "next";

export async function generateStaticParams() {
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
    const theme = await themeService.getPublished();
    return {
      icons: theme?.faviconUrl ? { icon: theme.faviconUrl } : undefined,
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
  const messages = await getMessages();
  const shell = await loadPublicShellContext(locale);
  const htmlLang =
    shell.htmlLang ?? getHtmlLangSync(locale, shell.enabledLocales);

  return (
    <div className="site-shell flex min-h-full flex-col">
      <DocumentAttributes lang={htmlLang} dir={shell.direction} />
      <GlobalStructuredData />
      <NextIntlClientProvider locale={locale} messages={messages}>
        <AccountSessionProvider>
        <ThemeProvider tokens={shell.theme}>
          <RecentlyViewedTracker />
          <ScrollRevealObserver />
          <SiteHeader
            workspace={shell.headerWorkspace}
            locale={locale}
            locales={shell.enabledLocales}
            enabledLocales={shell.enabledLocales}
            themePreset={shell.theme?.preset}
            headerConfig={shell.theme?.headerConfig}
          />
          <main className="site-main flex-1">
            <CatalogComparisonShell locale={locale}>
              <MarketingPageTransition>{children}</MarketingPageTransition>
            </CatalogComparisonShell>
          </main>
          <FooterRenderer
            resolved={shell.resolvedFooter}
            locale={locale}
            brandConfig={shell.brandConfig}
            company={shell.company}
          />
          <WhatsAppFab
            phone={shell.whatsappPhone}
            message={shell.whatsappMessage}
            settings={shell.whatsappSettings.fab}
            ariaLabel={shell.whatsappAriaLabel}
          />
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
      {process.env.NEXT_PUBLIC_GA_ID ? (
        <GoogleAnalytics gaId={process.env.NEXT_PUBLIC_GA_ID} />
      ) : null}
    </div>
  );
}
