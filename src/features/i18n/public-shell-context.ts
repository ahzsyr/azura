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
import {
  getDirectionByPrefix,
  getEnabledLocales,
  getLocaleByPrefix,
} from "@/i18n/locale-registry.server";
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

async function loadPublicShellContextUncached(
  locale: string,
  previewDraft: boolean,
): Promise<PublicShellContext> {
  const enabledLocales = await safeLoad(
    "enabledLocales",
    () => getEnabledLocales(),
    FALLBACK_LOCALES,
  );
  const localeEntry = await safeLoad(
    "localeEntry",
    () => getLocaleByPrefix(locale),
    enabledLocales.find((l) => l.urlPrefix === locale),
  );
  const direction = await safeLoad(
    "direction",
    () => getDirectionByPrefix(locale),
    locale === "ar" ? "rtl" : "ltr",
  );
  const htmlLang = localeEntry?.htmlLang ?? locale;

  const company = await getCompanyInfo();
  const theme = await safeLoad("theme", () => themeService.getForPreview(previewDraft), null);
  const personalizationSettings = await safeLoad(
    "personalization",
    () => personalizationService.get(),
    DEFAULT_PERSONALIZATION,
  );
  const footerWorkspace = await safeLoad(
    "footerWorkspace",
    () => footerService.getWorkspace(),
    createDefaultFooterWorkspace(),
  );
  const whatsappSettings = await safeLoad(
    "whatsappSettings",
    () => whatsappService.get(),
    DEFAULT_WHATSAPP_SETTINGS,
  );

  const siteIdentity = resolveSiteIdentity({
    companyName: company?.name,
    themeBrandName: resolveThemeBrandName(theme?.brandConfig),
    themeTagline: theme?.brandConfig?.tagline,
  });

  const headerWorkspace = await safeLoad(
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
  );

  const resolvedFooter = resolveFooter(footerWorkspace);
  const brandConfig = theme ? parseBrandConfig(theme.brandConfig) : parseBrandConfig({});
  const whatsappPhone = resolveWhatsAppPhone(company?.whatsapp);

  let whatsappMessage = `Hello, I would like to get in touch with ${siteIdentity.brandName}.`;
  let whatsappAriaLabel = "Chat on WhatsApp";
  try {
    const tWhatsapp = await getTranslations({ locale, namespace: "whatsapp" });
    whatsappMessage = tWhatsapp("message.default", { brandName: siteIdentity.brandName });
    whatsappAriaLabel = tWhatsapp("fab.ariaLabel");
  } catch (error) {
    console.error("[public-shell] whatsappTranslations failed:", error);
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
    () => loadPublicShellContextUncached(locale, false),
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

export async function loadPublicShellContext(
  locale: string,
  previewDraft = false,
): Promise<PublicShellContext> {
  if (previewDraft) {
    return loadPublicShellContextUncached(locale, true);
  }
  return getCachedPublicShellContext(locale);
}
