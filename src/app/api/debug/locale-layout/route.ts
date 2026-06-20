import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getMessages, getTranslations, setRequestLocale } from "next-intl/server";
import {
  resolvePreviewSiteTheme,
  resolvePublishedSiteTheme,
} from "@/lib/theme/resolve-site-theme.server";
import { readSiteSettings } from "@/features/catalog/site-settings.service";
import { loadPublicShellContext } from "@/features/i18n/public-shell-context";
import { loadComparisonShellProps } from "@/features/comparison/load-comparison-shell-props";
import { seoService } from "@/features/seo/seo.service";
import { resolveSitePreloader } from "@/features/preloader/resolve-site-preloader";
import { resolvePageTransitions } from "@/features/preloader/resolve-page-transitions";
import { resolveSiteAnnouncementBar } from "@/features/announcement-bar/resolve-site-announcement-bar";
import { resolveSitePopups } from "@/features/popups/resolve-site-popups";
import { getHtmlLangSync } from "@/i18n/locale-config";
import { isValidUrlPrefix } from "@/i18n/locale-registry.server";

export const dynamic = "force-dynamic";

type Step = {
  step: string;
  ok: boolean;
  ms?: number;
  detail?: Record<string, unknown>;
  error?: {
    name: string;
    message: string;
    digest?: string;
  };
};

const STEP_TIMEOUT_MS = 6_000;

function describeError(error: unknown): Step["error"] {
  return {
    name: error instanceof Error ? error.name : typeof error,
    message: error instanceof Error ? error.message : String(error),
    digest:
      error instanceof Error && "digest" in error
        ? String((error as Error & { digest?: unknown }).digest)
        : undefined,
  };
}

async function runTimedStep<T>(
  steps: Step[],
  step: string,
  fn: () => Promise<T> | T,
): Promise<T> {
  const startedAt = Date.now();
  let timeout: ReturnType<typeof setTimeout> | null = null;

  try {
    const result = await Promise.race([
      Promise.resolve().then(fn),
      new Promise<never>((_, reject) => {
        timeout = setTimeout(
          () => reject(new Error(`Timed out after ${STEP_TIMEOUT_MS}ms`)),
          STEP_TIMEOUT_MS,
        );
      }),
    ]);
    if (timeout) clearTimeout(timeout);
    steps.push({ step, ok: true, ms: Date.now() - startedAt });
    return result;
  } catch (error) {
    if (timeout) clearTimeout(timeout);
    steps.push({ step, ok: false, ms: Date.now() - startedAt, error: describeError(error) });
    throw error;
  }
}

export async function GET(request: Request) {
  const startedAt = Date.now();
  const url = new URL(request.url);
  const locale = url.searchParams.get("locale")?.trim() || "en";
  const mode = url.searchParams.get("mode")?.trim() || "full";
  const steps: Step[] = [];

  if (mode === "ping") {
    return NextResponse.json({
      result: "ok",
      mode,
      locale,
      elapsedMs: Date.now() - startedAt,
      steps: [{ step: "routeHandlerStarted", ok: true, ms: 0 }],
    });
  }

  if (mode === "locale-fallback") {
    const { FALLBACK_LOCALES } = await import("@/i18n/locale-config");
    const validPrefix = FALLBACK_LOCALES.some((fallbackLocale) => fallbackLocale.urlPrefix === locale);
    return NextResponse.json({
      result: "ok",
      mode,
      locale,
      elapsedMs: Date.now() - startedAt,
      steps: [
        {
          step: "validateFallbackLocales",
          ok: true,
          detail: { validPrefix, count: FALLBACK_LOCALES.length },
        },
      ],
    });
  }

  if (mode === "locale-service") {
    try {
      const validPrefix = await runTimedStep(steps, "isValidUrlPrefix", async () => {
        const registry = await import("@/i18n/locale-registry.server");
        return registry.isValidUrlPrefix(locale);
      });
      steps[steps.length - 1] = {
        ...steps[steps.length - 1],
        detail: { locale, validPrefix },
      };
      return NextResponse.json({
        result: "ok",
        mode,
        locale,
        elapsedMs: Date.now() - startedAt,
        steps,
      });
    } catch {
      return NextResponse.json(
        { result: "error", mode, locale, elapsedMs: Date.now() - startedAt, steps },
        { status: 500 },
      );
    }
  }

  if (mode === "prisma-locale") {
    try {
      const rows = await runTimedStep(steps, "prisma.localeConfig.findMany", async () => {
        const { prisma } = await import("@/lib/prisma");
        return prisma.localeConfig.findMany({
          where: { isEnabled: true },
          orderBy: [{ sortOrder: "asc" }, { code: "asc" }],
          select: { code: true, urlPrefix: true, isDefault: true },
        });
      });
      steps[steps.length - 1] = {
        ...steps[steps.length - 1],
        detail: { count: rows.length, prefixes: rows.map((row) => row.urlPrefix) },
      };
      return NextResponse.json({
        result: "ok",
        mode,
        locale,
        elapsedMs: Date.now() - startedAt,
        steps,
      });
    } catch {
      return NextResponse.json(
        { result: "error", mode, locale, elapsedMs: Date.now() - startedAt, steps },
        { status: 500 },
      );
    }
  }

  if (mode === "theme") {
    try {
      const resolvedTheme = await runTimedStep(steps, "resolvePublishedSiteTheme", () =>
        resolvePublishedSiteTheme(),
      );
      steps[steps.length - 1] = {
        ...steps[steps.length - 1],
        detail: {
          hasTokens: Boolean(resolvedTheme.tokens),
          tokenKeys: Object.keys(resolvedTheme.tokens).length,
        },
      };
      return NextResponse.json({
        result: "ok",
        mode,
        locale,
        elapsedMs: Date.now() - startedAt,
        steps,
      });
    } catch {
      return NextResponse.json(
        { result: "error", mode, locale, elapsedMs: Date.now() - startedAt, steps },
        { status: 500 },
      );
    }
  }

  if (mode === "messages") {
    try {
      await runTimedStep(steps, "setRequestLocale", () => {
        setRequestLocale(locale);
        return true;
      });
      const messages = await runTimedStep(steps, "getMessages", () => getMessages());
      steps[steps.length - 1] = {
        ...steps[steps.length - 1],
        detail: {
          namespaces: messages && typeof messages === "object" ? Object.keys(messages).length : null,
        },
      };
      return NextResponse.json({
        result: "ok",
        mode,
        locale,
        elapsedMs: Date.now() - startedAt,
        steps,
      });
    } catch {
      return NextResponse.json(
        { result: "error", mode, locale, elapsedMs: Date.now() - startedAt, steps },
        { status: 500 },
      );
    }
  }

  if (mode === "settings") {
    try {
      const siteSettings = await runTimedStep(steps, "readSiteSettings", () =>
        readSiteSettings(locale),
      );
      steps[steps.length - 1] = {
        ...steps[steps.length - 1],
        detail: { keys: Object.keys(siteSettings).length },
      };
      return NextResponse.json({
        result: "ok",
        mode,
        locale,
        elapsedMs: Date.now() - startedAt,
        steps,
      });
    } catch {
      return NextResponse.json(
        { result: "error", mode, locale, elapsedMs: Date.now() - startedAt, steps },
        { status: 500 },
      );
    }
  }

  if (mode === "shell") {
    try {
      const resolvedTheme = await runTimedStep(steps, "resolvePublishedSiteTheme", () =>
        resolvePublishedSiteTheme(),
      );
      const shell = await runTimedStep(steps, "loadPublicShellContext", () =>
        loadPublicShellContext(locale, { themeTokens: resolvedTheme.tokens }),
      );
      steps[steps.length - 1] = {
        ...steps[steps.length - 1],
        detail: {
          enabledLocalesCount: shell.enabledLocales.length,
          hasCompany: Boolean(shell.company),
          hasHeaderWorkspace: Boolean(shell.headerWorkspace),
          hasFooterWorkspace: Boolean(shell.footerWorkspace),
        },
      };
      return NextResponse.json({
        result: "ok",
        mode,
        locale,
        elapsedMs: Date.now() - startedAt,
        steps,
      });
    } catch {
      return NextResponse.json(
        { result: "error", mode, locale, elapsedMs: Date.now() - startedAt, steps },
        { status: 500 },
      );
    }
  }

  if (mode.startsWith("shell-")) {
    try {
      switch (mode) {
        case "shell-enabled-locales": {
          const { getEnabledLocales } = await import("@/i18n/locale-registry.server");
          const enabledLocales = await runTimedStep(steps, "getEnabledLocales", () =>
            getEnabledLocales(),
          );
          steps[steps.length - 1] = {
            ...steps[steps.length - 1],
            detail: { count: enabledLocales.length },
          };
          break;
        }
        case "shell-company": {
          const { getCompanyInfo } = await import("@/lib/data");
          const company = await runTimedStep(steps, "getCompanyInfo", () => getCompanyInfo());
          steps[steps.length - 1] = {
            ...steps[steps.length - 1],
            detail: { hasCompany: Boolean(company) },
          };
          break;
        }
        case "shell-personalization": {
          const { personalizationService } = await import(
            "@/features/personalization/personalization.service"
          );
          const personalization = await runTimedStep(steps, "personalizationService.get", () =>
            personalizationService.get(),
          );
          steps[steps.length - 1] = {
            ...steps[steps.length - 1],
            detail: { enabled: personalization.enabled },
          };
          break;
        }
        case "shell-footer": {
          const { footerService } = await import("@/features/footer/footer.service");
          const footer = await runTimedStep(steps, "footerService.getWorkspaceForSite", () =>
            footerService.getWorkspaceForSite(locale),
          );
          steps[steps.length - 1] = {
            ...steps[steps.length - 1],
            detail: { hasFooter: Boolean(footer) },
          };
          break;
        }
        case "shell-whatsapp": {
          const { whatsappService } = await import("@/features/whatsapp/whatsapp.service");
          const whatsapp = await runTimedStep(steps, "whatsappService.get", () =>
            whatsappService.get(),
          );
          steps[steps.length - 1] = {
            ...steps[steps.length - 1],
            detail: {
              fabEnabled: whatsapp.fab.enabled,
              contactPageEnabled: whatsapp.contactPage.enabled,
              contentInquiryEnabled: whatsapp.contentInquiry.enabled,
            },
          };
          break;
        }
        case "shell-prefix-code": {
          const { prefixToCode } = await import("@/i18n/locale-registry.server");
          const code = await runTimedStep(steps, "prefixToCode", () => prefixToCode(locale));
          steps[steps.length - 1] = {
            ...steps[steps.length - 1],
            detail: { code },
          };
          break;
        }
        case "shell-tagline": {
          const { prefixToCode } = await import("@/i18n/locale-registry.server");
          const { translationService } = await import("@/features/translation/translation.service");
          const code = await runTimedStep(steps, "prefixToCode", () => prefixToCode(locale));
          const tagline = await runTimedStep(steps, "translationService.resolveField", () =>
            translationService.resolveField("SiteIdentity", "default", "siteTagline", code, {
              legacyFallback: "",
            }),
          );
          steps[steps.length - 1] = {
            ...steps[steps.length - 1],
            detail: { length: tagline.length },
          };
          break;
        }
        case "shell-header": {
          const { navigationService } = await import("@/features/navigation/navigation.service");
          const resolvedTheme = await runTimedStep(steps, "resolvePublishedSiteTheme", () =>
            resolvePublishedSiteTheme(),
          );
          const header = await runTimedStep(steps, "navigationService.getWorkspaceForSite", () =>
            navigationService.getWorkspaceForSite(
              {
                logoUrl: resolvedTheme.tokens.logoUrl,
                brandConfig: resolvedTheme.tokens.brandConfig,
                siteName: "debug",
                tagline: "",
              },
              locale,
            ),
          );
          steps[steps.length - 1] = {
            ...steps[steps.length - 1],
            detail: { hasHeader: Boolean(header) },
          };
          break;
        }
        case "shell-header-raw": {
          const { navigationService } = await import("@/features/navigation/navigation.service");
          const header = await runTimedStep(steps, "navigationService.getWorkspace", () =>
            navigationService.getWorkspace(),
          );
          steps[steps.length - 1] = {
            ...steps[steps.length - 1],
            detail: {
              hasHeader: Boolean(header),
              menuCount: Object.keys(header.menusDatabase ?? {}).length,
              activeMenuKey: header.activeMenuKey,
            },
          };
          break;
        }
        case "shell-header-translations": {
          const { navigationService } = await import("@/features/navigation/navigation.service");
          const { enrichHeaderWorkspaceWithMenuTranslations } = await import(
            "@/features/navigation/mega-menu-card-images"
          );
          const header = await runTimedStep(steps, "navigationService.getWorkspace", () =>
            navigationService.getWorkspace(),
          );
          steps[steps.length - 1] = {
            ...steps[steps.length - 1],
            detail: {
              hasHeader: Boolean(header),
              menuCount: Object.keys(header.menusDatabase ?? {}).length,
            },
          };
          const localized = await runTimedStep(steps, "enrichHeaderWorkspaceWithMenuTranslations", () =>
            enrichHeaderWorkspaceWithMenuTranslations(header, locale),
          );
          steps[steps.length - 1] = {
            ...steps[steps.length - 1],
            detail: {
              hasHeader: Boolean(localized),
              menuCount: Object.keys(localized.menusDatabase ?? {}).length,
            },
          };
          break;
        }
        case "shell-header-images": {
          const { navigationService } = await import("@/features/navigation/navigation.service");
          const { enrichFlyoutMenuImagesOnly } = await import(
            "@/features/navigation/mega-menu-card-images"
          );
          const header = await runTimedStep(steps, "navigationService.getWorkspace", () =>
            navigationService.getWorkspace(),
          );
          steps[steps.length - 1] = {
            ...steps[steps.length - 1],
            detail: {
              hasHeader: Boolean(header),
              menuCount: Object.keys(header.menusDatabase ?? {}).length,
            },
          };
          const enriched = await runTimedStep(steps, "enrichFlyoutMenuImagesOnly", () =>
            enrichFlyoutMenuImagesOnly(header, locale),
          );
          steps[steps.length - 1] = {
            ...steps[steps.length - 1],
            detail: {
              hasHeader: Boolean(enriched),
              menuCount: Object.keys(enriched.menusDatabase ?? {}).length,
            },
          };
          break;
        }
        case "shell-whatsapp-i18n": {
          const tWhatsapp = await runTimedStep(steps, "getTranslations.whatsapp", () =>
            getTranslations({ locale, namespace: "whatsapp" }).catch(() => null),
          );
          steps[steps.length - 1] = {
            ...steps[steps.length - 1],
            detail: { hasTranslations: Boolean(tWhatsapp) },
          };
          break;
        }
        default:
          return NextResponse.json(
            { result: "unknown_mode", mode, locale, elapsedMs: Date.now() - startedAt, steps },
            { status: 400 },
          );
      }

      return NextResponse.json({
        result: "ok",
        mode,
        locale,
        elapsedMs: Date.now() - startedAt,
        steps,
      });
    } catch {
      return NextResponse.json(
        { result: "error", mode, locale, elapsedMs: Date.now() - startedAt, steps },
        { status: 500 },
      );
    }
  }

  if (mode === "comparison") {
    try {
      const comparison = await runTimedStep(steps, "loadComparisonShellProps", () =>
        loadComparisonShellProps(locale),
      );
      steps[steps.length - 1] = {
        ...steps[steps.length - 1],
        detail: { hasComparison: Boolean(comparison) },
      };
      return NextResponse.json({
        result: "ok",
        mode,
        locale,
        elapsedMs: Date.now() - startedAt,
        steps,
      });
    } catch {
      return NextResponse.json(
        { result: "error", mode, locale, elapsedMs: Date.now() - startedAt, steps },
        { status: 500 },
      );
    }
  }

  if (mode === "seo") {
    try {
      const globalStructured = await runTimedStep(steps, "seoService.getGlobalStructured", () =>
        seoService.getGlobalStructured().catch(() => null),
      );
      steps[steps.length - 1] = {
        ...steps[steps.length - 1],
        detail: { hasGlobalStructured: Boolean(globalStructured) },
      };
      return NextResponse.json({
        result: "ok",
        mode,
        locale,
        elapsedMs: Date.now() - startedAt,
        steps,
      });
    } catch {
      return NextResponse.json(
        { result: "error", mode, locale, elapsedMs: Date.now() - startedAt, steps },
        { status: 500 },
      );
    }
  }

  try {
    const validPrefix = await runTimedStep(steps, "isValidUrlPrefix", () =>
      isValidUrlPrefix(locale),
    );
    steps[steps.length - 1] = {
      ...steps[steps.length - 1],
      detail: { locale, validPrefix },
    };
    if (!validPrefix) {
      return NextResponse.json(
        { result: "invalid_locale", locale, elapsedMs: Date.now() - startedAt, steps },
        { status: 400 },
      );
    }
  } catch (error) {
    steps.push({ step: "isValidUrlPrefix", ok: false, error: describeError(error) });
    return NextResponse.json(
      { result: "error", locale, elapsedMs: Date.now() - startedAt, steps },
      { status: 500 },
    );
  }

  const cookieStore = await cookies();
  const previewDraft = cookieStore.get("theme-preview")?.value === "draft";
  steps.push({ step: "readCookies", ok: true, detail: { previewDraft } });

  try {
    await runTimedStep(steps, "setRequestLocale", () => {
      setRequestLocale(locale);
      return true;
    });

    const resolvedTheme = await runTimedStep(steps, "resolveSiteTheme", () =>
      previewDraft ? resolvePreviewSiteTheme() : resolvePublishedSiteTheme(),
    );

    const messages = await runTimedStep(steps, "getMessages", () => getMessages());
    const siteSettings = await runTimedStep(steps, "readSiteSettings", () =>
      readSiteSettings(locale),
    );
    const shell = await runTimedStep(steps, "loadPublicShellContext", () =>
      loadPublicShellContext(locale, { themeTokens: resolvedTheme.tokens }),
    );
    const comparison = await runTimedStep(steps, "loadComparisonShellProps", () =>
      loadComparisonShellProps(locale),
    );
    const globalStructured = await runTimedStep(steps, "seoService.getGlobalStructured", () =>
      seoService.getGlobalStructured().catch(() => null),
    );

    const brandConfig = shell.brandConfig ?? shell.theme?.brandConfig;
    const preloaderSettings = resolveSitePreloader(siteSettings, {
      themeLogoUrl: shell.theme?.logoUrl,
      brandLogoLightUrl: brandConfig?.logoImageLightUrl ?? brandConfig?.logoImageUrl,
      brandLogoDarkUrl: brandConfig?.logoImageDarkUrl,
    });
    const pageTransitionSettings = resolvePageTransitions(siteSettings);
    const announcementBarSettings = resolveSiteAnnouncementBar(siteSettings);
    const popupSettings = resolveSitePopups(siteSettings);
    const htmlLang = shell.htmlLang ?? getHtmlLangSync(locale, shell.enabledLocales);

    steps.push({
      step: "assembleLocaleLayoutData",
      ok: true,
      detail: {
        htmlLang,
        messageNamespaces:
          messages && typeof messages === "object" ? Object.keys(messages).length : null,
        direction: shell.direction,
        enabledLocalesCount: shell.enabledLocales.length,
        hasHeaderWorkspace: Boolean(shell.headerWorkspace),
        hasFooter: Boolean(shell.resolvedFooter),
        hasTheme: Boolean(shell.theme),
        preloaderEnabled: preloaderSettings.enabled,
        pageTransitionsEnabled: pageTransitionSettings.enabled,
        announcementEnabled: announcementBarSettings.enabled,
        popupItemCount: popupSettings.items.length,
        activePopupCount: popupSettings.activeItems.length,
        hasComparison: Boolean(comparison),
        hasGlobalStructured: Boolean(globalStructured),
      },
    });

    return NextResponse.json({
      result: "ok",
      locale,
      elapsedMs: Date.now() - startedAt,
      steps,
    });
  } catch {
    return NextResponse.json(
      { result: "error", locale, elapsedMs: Date.now() - startedAt, steps },
      { status: 500 },
    );
  }
}
