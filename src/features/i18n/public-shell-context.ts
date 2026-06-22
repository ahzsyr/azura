import "server-only";

import { getTranslations } from "next-intl/server";
import { CACHE_TAGS, createCached } from "@/services/cache";
import { createDefaultFooterWorkspace } from "@/features/footer/defaults";
import { footerService } from "@/features/footer/footer.service";
import type { FooterWorkspace } from "@/features/footer/types";
import { createEmptyWorkspace, mergeHeaderWorkspaceWithTheme } from "@/features/navigation/defaults";
import { navigationService } from "@/features/navigation/navigation.service";
import type { HeaderWorkspace } from "@/features/navigation/types";
import { personalizationService } from "@/capabilities/personalization/personalization.service";
import type { PersonalizationSettings } from "@/capabilities/personalization/personalization.service";
import { themeService } from "@/features/theme/theme.service";
import { DEFAULT_WHATSAPP_SETTINGS } from "@/features/whatsapp/whatsapp.schema";
import { whatsappService } from "@/features/whatsapp/whatsapp.service";
import type { WhatsAppSettings } from "@/features/whatsapp/whatsapp.schema";
import { FALLBACK_LOCALES, type PublicLocale } from "@/i18n/locale-config";
import { getEnabledLocales } from "@/i18n/locale-registry.server";
import { getCompanyInfo } from "@/lib/data";
import type { CompanyInfoView } from "@/features/translation/admin-entity-helpers";
import { resolveSiteIdentity, resolveThemeBrandName } from "@/lib/site-identity";
import { translationService } from "@/features/translation/translation.service";
import { prefixToCode } from "@/i18n/locale-registry.server";
import { parseBrandConfig } from "@/features/theme/theme-config";
import { resolveFooter } from "@/features/footer/resolve-footer";
import type { ResolvedFooter } from "@/features/footer/types";
import type { SiteBrandConfig } from "@/types/site-identity";
import type { ThemeTokens } from "@/types/theme";
import { resolveWhatsAppPhone } from "@/features/whatsapp/whatsapp-message";
import { resolveDirection } from "@/shared/layout/direction/direction-resolver";

export type PublicShellContext = {
  company: CompanyInfoView | null;
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

const HEADER_WORKSPACE_TIMEOUT_MS = 5_000;
const lastKnownHeaderWorkspaceByLocale = new Map<string, HeaderWorkspace>();

function summarizeHeaderWorkspace(workspace: HeaderWorkspace) {
  const active = workspace.menusDatabase[workspace.activeMenuKey];
  return {
    menuItemCount: active?.items?.length ?? 0,
    logoPresent: Boolean(workspace.branding.logoImageLightUrl || workspace.branding.logoImageDarkUrl),
    activeMenuKey: workspace.activeMenuKey,
  };
}

function rememberHeaderWorkspace(locale: string, workspace: HeaderWorkspace) {
  lastKnownHeaderWorkspaceByLocale.set(locale, workspace);
  lastKnownHeaderWorkspaceByLocale.set("*", workspace);
}

function getLastKnownHeaderWorkspace(locale: string): HeaderWorkspace | null {
  return lastKnownHeaderWorkspaceByLocale.get(locale) ?? lastKnownHeaderWorkspaceByLocale.get("*") ?? null;
}

function isTimeoutError(error: unknown): boolean {
  return error instanceof Error && error.message.includes("timed out");
}

export async function loadHeaderWorkspaceForPublicShell(args: {
  locale: string;
  theme: ThemeTokens | null;
  siteIdentity: { brandName: string; tagline: string };
}): Promise<HeaderWorkspace> {
  try {
    const workspace = await withTimeout(
      "headerWorkspace",
      navigationService.getWorkspaceForSite(
        {
          logoUrl: args.theme?.logoUrl,
          brandConfig: args.theme?.brandConfig,
          siteName: args.siteIdentity.brandName,
          tagline: args.siteIdentity.tagline,
        },
        args.locale,
      ),
      HEADER_WORKSPACE_TIMEOUT_MS,
    );
    rememberHeaderWorkspace(args.locale, workspace);
    console.info("[public-shell] headerWorkspace loaded", {
      source: "cache",
      locale: args.locale,
      ...summarizeHeaderWorkspace(workspace),
    });
    return workspace;
  } catch (error) {
    const reason = isTimeoutError(error) ? "timeout" : "exception";
    const lastKnown = getLastKnownHeaderWorkspace(args.locale);
    if (lastKnown) {
      console.error("[public-shell] headerWorkspace failed; using last known", {
        source: "fallback",
        reason,
        locale: args.locale,
        error: error instanceof Error ? error.message : String(error),
        ...summarizeHeaderWorkspace(lastKnown),
      });
      return lastKnown;
    }
    try {
      // Use a lightweight workspace fallback (no image enrichment) to keep real branding/menu on slow starts.
      const baseWorkspace = await navigationService.getWorkspace();
      const lightweightWorkspace = mergeHeaderWorkspaceWithTheme(baseWorkspace, {
        logoUrl: args.theme?.logoUrl,
        brandConfig: args.theme?.brandConfig,
        siteName: args.siteIdentity.brandName,
        tagline: args.siteIdentity.tagline,
      });
      rememberHeaderWorkspace(args.locale, lightweightWorkspace);
      console.warn("[public-shell] headerWorkspace fallback loaded", {
        source: "fallback",
        reason: `${reason}-lightweight-workspace`,
        locale: args.locale,
        error: error instanceof Error ? error.message : String(error),
        ...summarizeHeaderWorkspace(lightweightWorkspace),
      });
      return lightweightWorkspace;
    } catch (fallbackError) {
      console.error("[public-shell] headerWorkspace lightweight fallback failed:", fallbackError);
    }
    const safeShell = createEmptyWorkspace();
    console.error("[public-shell] headerWorkspace failed; using safe shell", {
      source: "fallback",
      reason,
      locale: args.locale,
      error: error instanceof Error ? error.message : String(error),
      ...summarizeHeaderWorkspace(safeShell),
    });
    return safeShell;
  }
}

async function withTimeout<T>(label: string, promise: Promise<T>, timeoutMs: number): Promise<T> {
  let timeout: ReturnType<typeof setTimeout> | null = null;
  try {
    return await Promise.race([
      promise,
      new Promise<never>((_, reject) => {
        timeout = setTimeout(
          () => reject(new Error(`${label} timed out after ${timeoutMs}ms`)),
          timeoutMs,
        );
      }),
    ]);
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}

async function safeLoad<T>(
  label: string,
  fn: () => Promise<T>,
  fallback: T,
  timeoutMs?: number,
): Promise<T> {
  try {
    const promise = fn();
    return timeoutMs ? await withTimeout(label, promise, timeoutMs) : await promise;
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
  const direction = resolveDirection(locale, enabledLocales);
  const htmlLang = localeEntry?.htmlLang ?? locale;
  return { localeEntry, direction, htmlLang };
}

type ResolveLocalizedSiteTaglineDeps = {
  resolvePrefixToCode?: typeof prefixToCode;
  resolveField?: typeof translationService.resolveField;
};

export async function resolveLocalizedSiteTagline(
  locale: string,
  fallbackTagline: string,
  deps: ResolveLocalizedSiteTaglineDeps = {},
): Promise<string> {
  try {
    const resolvePrefixToCode = deps.resolvePrefixToCode ?? prefixToCode;
    const resolveField = deps.resolveField ?? translationService.resolveField.bind(translationService);
    const localeCode = await resolvePrefixToCode(locale);
    const localizedTagline = await resolveField(
      "SiteIdentity",
      "default",
      "siteTagline",
      localeCode,
      { legacyFallback: fallbackTagline }
    );
    return localizedTagline.trim() || fallbackTagline;
  } catch (error) {
    console.error("[public-shell] siteTagline translation failed:", error);
    return fallbackTagline;
  }
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
    safeLoad("footerWorkspace", () => footerService.getWorkspaceForSite(locale), createDefaultFooterWorkspace()),
    safeLoad("whatsappSettings", () => whatsappService.get(), DEFAULT_WHATSAPP_SETTINGS),
  ]);

  const { localeEntry, direction, htmlLang } = resolveLocaleMeta(locale, enabledLocales);

  const siteIdentity = resolveSiteIdentity({
    companyName: company?.name,
    themeBrandName: resolveThemeBrandName(theme?.brandConfig),
    themeTagline: theme?.brandConfig?.tagline,
  });

  const localizedTagline = await resolveLocalizedSiteTagline(locale, siteIdentity.tagline);
  const localizedSiteIdentity = {
    ...siteIdentity,
    tagline: localizedTagline,
  };

  const [headerWorkspace, tWhatsapp] = await Promise.all([
    loadHeaderWorkspaceForPublicShell({
      locale,
      theme,
      siteIdentity: localizedSiteIdentity,
    }),
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
    siteIdentity: localizedSiteIdentity,
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
        CACHE_TAGS.translations,
        CACHE_TAGS.json("header-workspace"),
        CACHE_TAGS.json("footer-workspace"),
        CACHE_TAGS.json("settings"),
        "header-workspace",
        "footer-workspace",
      ],
      revalidate: 300,
    },
  )();
}

export type LoadPublicShellOptions = {
  previewDraft?: boolean;
  themeTokens?: ThemeTokens | null;
};

export function createFallbackPublicShellContext(
  locale: string,
  options: { themeTokens?: ThemeTokens | null } = {},
): PublicShellContext {
  const enabledLocales = FALLBACK_LOCALES;
  const { localeEntry, direction, htmlLang } = resolveLocaleMeta(locale, enabledLocales);
  const theme = options.themeTokens ?? null;
  const siteIdentity = resolveSiteIdentity({
    themeBrandName: resolveThemeBrandName(theme?.brandConfig),
    themeTagline: theme?.brandConfig?.tagline,
  });
  const footerWorkspace = createDefaultFooterWorkspace();
  const brandConfig = theme ? parseBrandConfig(theme.brandConfig) : parseBrandConfig({});

  return {
    company: null,
    theme,
    personalizationSettings: DEFAULT_PERSONALIZATION,
    footerWorkspace,
    whatsappSettings: DEFAULT_WHATSAPP_SETTINGS,
    headerWorkspace: createEmptyWorkspace(),
    resolvedFooter: resolveFooter(footerWorkspace),
    brandConfig,
    siteIdentity,
    whatsappPhone: "",
    whatsappMessage: `Hello, I would like to get in touch with ${siteIdentity.brandName}.`,
    whatsappAriaLabel: "Chat on WhatsApp",
    enabledLocales,
    localeEntry,
    htmlLang,
    direction,
  };
}

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
