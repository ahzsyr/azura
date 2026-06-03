import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import { NextIntlClientProvider } from "next-intl";
import { getMessages, setRequestLocale } from "next-intl/server";
import { routing } from "@/i18n/routing";
import { getHtmlLangSync } from "@/i18n/locale-config";
import {
  getDirectionByPrefix,
  getEnabledLocales,
  getEnabledUrlPrefixes,
  getLocaleByPrefix,
  isValidUrlPrefix,
} from "@/i18n/locale-registry.server";
import { localeService } from "@/features/i18n/locale.service";
import { SiteHeader } from "@/components/layout/site-header";
import { navigationService } from "@/features/navigation/navigation.service";
import { FooterRenderer } from "@/features/footer/components/FooterRenderer";
import { footerService } from "@/features/footer/footer.service";
import { resolveFooter } from "@/features/footer/resolve-footer";
import { parseBrandConfig } from "@/features/theme/theme-config";
import { WhatsAppFab } from "@/components/layout/whatsapp-fab";
import { DocumentAttributes } from "@/components/layout/document-attributes";
import { ThemeProvider } from "@/components/theme/theme-provider";
import { getCompanyInfo } from "@/lib/data";
import { themeService } from "@/features/theme/theme.service";
import { GlobalStructuredData } from "@/features/seo/components/global-structured-data";
import { personalizationService } from "@/features/personalization/personalization.service";
import { PersonalizationPanel } from "@/components/personalization/personalization-panel";
import { resolveSiteIdentity } from "@/lib/site-identity";
import { ScrollRevealObserver } from "@/components/motion/scroll-reveal-observer";
import { MarketingPageTransition } from "@/components/motion/marketing-page-transition";
import { CatalogComparisonShell } from "@/components/comparison/catalog-comparison-shell";
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
  const cookieStore = await cookies();
  const previewDraft = cookieStore.get("theme-preview")?.value === "draft";
  const theme = await themeService.getForPreview(previewDraft);
  return {
    icons: theme?.faviconUrl ? { icon: theme.faviconUrl } : undefined,
  };
}

type Props = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
};

export default async function LocaleLayout({ children, params }: Props) {
  const { locale } = await params;

  if (!(await isValidUrlPrefix(locale))) {
    notFound();
  }

  setRequestLocale(locale);
  const localeEntry = await getLocaleByPrefix(locale);
  const enabledLocales = await getEnabledLocales();
  const htmlLang = localeEntry?.htmlLang ?? getHtmlLangSync(locale, enabledLocales);
  const direction = await getDirectionByPrefix(locale);
  const messages = await getMessages();
  const cookieStore = await cookies();
  const previewDraft = cookieStore.get("theme-preview")?.value === "draft";
  const [company, theme, personalizationSettings, footerWorkspace] = await Promise.all([
    getCompanyInfo(),
    themeService.getForPreview(previewDraft),
    personalizationService.get(),
    footerService.getWorkspace(),
  ]);
  const siteIdentity = resolveSiteIdentity({
    companyName: company?.name,
    themeBrandName: theme?.brandConfig?.brandName,
    themeTagline: theme?.brandConfig?.tagline,
  });
  const headerWorkspace = await navigationService.getWorkspaceForSite(
    {
      logoUrl: theme?.logoUrl,
      brandConfig: theme?.brandConfig,
      siteName: siteIdentity.brandName,
      tagline: siteIdentity.tagline,
    },
    locale,
  );
  const resolvedFooter = resolveFooter(footerWorkspace);
  const brandConfig = theme ? parseBrandConfig(theme.brandConfig) : parseBrandConfig({});

  return (
    <div className="site-shell flex min-h-full flex-col">
      <DocumentAttributes lang={htmlLang} dir={direction} />
      <GlobalStructuredData />
      <NextIntlClientProvider messages={messages}>
        <ThemeProvider>
          <ScrollRevealObserver />
          <SiteHeader
            workspace={headerWorkspace}
            locale={locale}
            locales={enabledLocales}
            enabledLocales={enabledLocales}
            themePreset={theme?.preset}
            headerConfig={theme?.headerConfig}
          />
          <main className="site-main flex-1">
            <CatalogComparisonShell locale={locale}>
              <MarketingPageTransition>{children}</MarketingPageTransition>
            </CatalogComparisonShell>
          </main>
          <FooterRenderer
            resolved={resolvedFooter}
            locale={locale}
            brandConfig={brandConfig}
            company={company}
          />
          <WhatsAppFab phone={company?.whatsapp ?? process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? ""} />
          <PersonalizationPanel settings={personalizationSettings} theme={theme} locale={locale} />
        </ThemeProvider>
      </NextIntlClientProvider>
      {process.env.NEXT_PUBLIC_GA_ID && (
        <script
          async
          src={`https://www.googletagmanager.com/gtag/js?id=${process.env.NEXT_PUBLIC_GA_ID}`}
        />
      )}
    </div>
  );
}
