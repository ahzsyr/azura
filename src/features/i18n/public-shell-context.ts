import "server-only";

import { getTranslations } from "next-intl/server";
import { CACHE_TAGS, createCached } from "@/services/cache";
import { createDefaultFooterWorkspace } from "@/features/footer/defaults";
import { footerService } from "@/features/footer/footer.service";
import type { FooterWorkspace } from "@/features/footer/types";
import { createDefaultWorkspace } from "@/features/navigation/defaults";
import { navigationService } from "@/features/navigation/navigation.service";
import type { HeaderWorkspace } from "@/features/navigation/types";
import { personalizationService } from "@/features/personalization/personalization.service";
import type { PersonalizationSettings } from "@/features/personalization/personalization.service";
import { themeService } from "@/features/theme/theme.service";
import { DEFAULT_WHATSAPP_SETTINGS } from "@/features/whatsapp/whatsapp.schema";
import { whatsappService } from "@/features/whatsapp/whatsapp.service";
import type { WhatsAppSettings } from "@/features/whatsapp/whatsapp.schema";
import { FALLBACK_LOCALES, type PublicLocale } from "@/i18n/locale-config";
import { getEnabledLocales } from "@/i18n/locale-registry.server";
import { getCompanyInfo } from "@/lib/data";
import type { CompanyInfo } from "@prisma/client";
import { resolveSiteIdentity, resolveThemeBrandName } from "@/lib/site-identity";
import { parseBrandConfig } from "@/features/theme/theme-config";
import { resolveFooter } from "@/features/footer/resolve-footer";
import type { ResolvedFooter } from "@/features/footer/types";
import type { SiteBrandConfig } from "@/types/site-identity";
import type { ThemeTokens } from "@/types/theme";
import { resolveWhatsAppPhone } from "@/features/whatsapp/whatsapp-message";

export type PublicShellContext = {
  company: CompanyInfo | null;
  theme: ThemeTokens | null;
  personalizationSettings: PersonalizationSettings;
  footerWorkspace: FooterWorkspace;
  whatsappSettings: WhatsAppSettings;
  headerWorkspace: HeaderWorkspace;
  resolvedFooter: ResolvedFooter;
  brandConfig: SiteBrandConfig;
  siteIdentity: ReturnType<typeof resolveSiteIdentity>;
  whatsappPhone: string;
  whatsappMessage: string;
  whatsappAriaLabel: string;
  enabledLocales: PublicLocale[];
  localeEntry: PublicLocale | undefined;
  htmlLang: string;
  direction: "ltr" | "rtl";
};

const DEFAULT_PERSONALIZATION: PersonalizationSettings = {
  enabled: true,
  position: "bottom-end",
  presets: [],
  widgetSections: {
    showAppearance: true,
    showStyle: true,
    showFabThemeToggle: true,
    showBackToTop: true,
  },
};

async function safeLoad<T>(label: string, fn: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    console.error(`[public-shell] ${label} failed:`, error);
    return fallback;
  }
}

type ShellLoadOptions = {
  previewDraft: boolean;
  /** Skip theme fetch when layout already resolved published theme. */
  themeTokens?: ThemeTokens | null;
};

function resolveLocaleMeta(
  locale: string,
  enabledLocales: PublicLocale[],
): { localeEntry: PublicLocale | undefined; direction: "ltr" | "rtl"; htmlLang: string } {
  const localeEntry = enabledLocales.find((l) => l.urlPrefix === locale);
  const direction =
    localeEntry?.dir === "rtl"
      ? "rtl"
      : locale === "ar" || locale.startsWith("ar")
        ? "rtl"
        : "ltr";
  const htmlLang = localeEntry?.htmlLang ?? locale;
  return { localeEntry, direction, htmlLang };
}

async function loadPublicShellContextUncached(
  locale: string,
  options: ShellLoadOptions,
): Promise<PublicShellContext> {
  const { previewDraft, themeTokens } = options;

  const [
    enabledLocales,
    company,
    theme,
    personalizationSettings,
    footerWorkspace,
    whatsappSettings,
  ] = await Promise.all([
    safeLoad("enabledLocales", () => getEnabledLocales(), FALLBACK_LOCALES),
    getCompanyInfo(),
    themeTokens !== undefined
      ? Promise.resolve(themeTokens)
      : safeLoad("theme", () => themeService.getForPreview(previewDraft), null),
    safeLoad("personalization", () => personalizationService.get(), DEFAULT_PERSONALIZATION),
    safeLoad("footerWorkspace", () => footerService.getWorkspace(), createDefaultFooterWorkspace()),
    safeLoad("whatsappSettings", () => whatsappService.get(), DEFAULT_WHATSAPP_SETTINGS),
  ]);

  const { localeEntry, direction, htmlLang } = resolveLocaleMeta(locale, enabledLocales);

  const siteIdentity = resolveSiteIdentity({
    companyName: company?.name,
    themeBrandName: resolveThemeBrandName(theme?.brandConfig),
    themeTagline: theme?.brandConfig?.tagline,
  });

  const [headerWorkspace, tWhatsapp] = await Promise.all([
    safeLoad(
      "headerWorkspace",
      () =>
        navigationService.getWorkspaceForSite(
          {
            logoUrl: theme?.logoUrl,
            brandConfig: theme?.brandConfig,
            siteName: siteIdentity.brandName,
            tagline: siteIdentity.tagline,
          },
          locale,
        ),
      createDefaultWorkspace(),
    ),
    getTranslations({ locale, namespace: "whatsapp" }).catch(() => null),
  ]);

  const resolvedFooter = resolveFooter(footerWorkspace);
  const brandConfig = theme ? parseBrandConfig(theme.brandConfig) : parseBrandConfig({});
  const whatsappPhone = resolveWhatsAppPhone(company?.whatsapp);

  let whatsappMessage = `Hello, I would like to get in touch with ${siteIdentity.brandName}.`;
  let whatsappAriaLabel = "Chat on WhatsApp";
  if (tWhatsapp) {
    try {
      whatsappMessage = tWhatsapp("message.default", { brandName: siteIdentity.brandName });
      whatsappAriaLabel = tWhatsapp("fab.ariaLabel");
    } catch (error) {
      console.error("[public-shell] whatsappTranslations failed:", error);
    }
  }

  return {
    company,
    theme,
    personalizationSettings,
    footerWorkspace,
    whatsappSettings,
    headerWorkspace,
    resolvedFooter,
    brandConfig,
    siteIdentity,
    whatsappPhone,
    whatsappMessage,
    whatsappAriaLabel,
    enabledLocales,
    localeEntry,
    htmlLang,
    direction,
  };
}

function getCachedPublicShellContext(locale: string): Promise<PublicShellContext> {
  return createCached(
    () => loadPublicShellContextUncached(locale, { previewDraft: false }),
    ["public-shell", locale],
    {
      tags: [
        CACHE_TAGS.theme,
        CACHE_TAGS.company,
        CACHE_TAGS.locales,
        CACHE_TAGS.marketing,
      ],
      revalidate: 300,
    },
  )();
}

export type LoadPublicShellOptions = {
  previewDraft?: boolean;
  themeTokens?: ThemeTokens | null;
};

export async function loadPublicShellContext(
  locale: string,
  options: LoadPublicShellOptions = {},
): Promise<PublicShellContext> {
  const previewDraft = options.previewDraft ?? false;
  if (previewDraft || options.themeTokens !== undefined) {
    return loadPublicShellContextUncached(locale, {
      previewDraft,
      themeTokens: options.themeTokens,
    });
  }
  return getCachedPublicShellContext(locale);
}
