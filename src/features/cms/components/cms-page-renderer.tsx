import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import type { Locale } from "@/i18n/routing";
import type { CmsPage, EntityTranslation } from "@prisma/client";
import { cmsService } from "@/features/cms/cms.service";
import { BlockRenderer } from "@/features/builder/components/block-renderer";
import {
  isPageHeaderOverlayActive,
  resolvePageHeaderOverlay,
} from "@/features/builder/header-overlay";
import { createEmptyWorkspace } from "@/features/navigation/defaults";
import { navigationService } from "@/features/navigation/navigation.service";
import { themeService } from "@/features/theme/theme.service";
import type { PageBlocks } from "@/types/builder";
import { getLocalizedField } from "@/lib/utils";
import type { TranslationBundle } from "@/features/translation/translation-bundle";
import { getBundleTranslations, loadPageTranslationBundle } from "@/features/translation/translation-bundle";
import { localeService } from "@/features/i18n/locale.service";
import { translationService } from "@/features/translation/translation.service";
import { parsePageVisualSettings } from "@/schemas/visual-settings";
import { resolveVisualExperience } from "@/features/theme/visual-experience-resolver";
import { VisualExperienceProvider } from "@/components/theme/visual-experience-provider";
import { FALLBACK_LOCALES } from "@/i18n/locale-config";
import { logServerRenderDiagnostic } from "@/lib/debug/server-render-log";
import { getErrorMessage, isRecoverableDbError } from "@/lib/debug/recoverable-db-error";
import { renderCmsDegradationResponse } from "@/features/cms/components/cms-degradation-response";

type Props = {
  slug: string;
  locale: Locale;
  page?: CmsPage | null;
  translationBundle?: TranslationBundle;
  pageTranslations?: EntityTranslation[];
};

const HEADER_WORKSPACE_TIMEOUT_MS = 2_500;

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

export async function CmsPageRenderer({
  slug,
  locale,
  page: pageProp,
  translationBundle,
  pageTranslations: pageTranslationsProp,
}: Props) {
  try {
    let page: CmsPage;
    try {
      const resolved = pageProp ?? (await cmsService.getPublishedPageBySlug(slug));
      if (!resolved) notFound();
      page = resolved;
    } catch (error) {
      if (isRecoverableDbError(error)) {
        const message = getErrorMessage(error);
        console.warn(`[CmsPageRenderer] /${slug} page load fallback:`, message);
        return renderCmsDegradationResponse(slug, locale, { skipLive: true });
      }
      throw error;
    }

  const blocks = (page.blocks as PageBlocks) ?? [];

  const resolvedTranslationBundle =
    translationBundle ??
    (await loadPageTranslationBundle("CmsPage", page.id, blocks).catch((error) => {
      logServerRenderDiagnostic("CmsPageRenderer.translationBundle", error);
      return undefined;
    }));

  let theme: Awaited<ReturnType<typeof themeService.getPublished>> = null;
  let headerWorkspace = createEmptyWorkspace();
  let enabledLocales = resolvedTranslationBundle?.enabledLocales ?? FALLBACK_LOCALES;
  let pageTranslations: EntityTranslation[] =
    pageTranslationsProp !== undefined
      ? pageTranslationsProp
      : resolvedTranslationBundle
        ? getBundleTranslations(resolvedTranslationBundle, "CmsPage", page.id)
        : [];

  const needsLocales = !resolvedTranslationBundle?.enabledLocales;
  const needsTranslations =
    pageTranslationsProp === undefined && !resolvedTranslationBundle;

  const [themeResult, localesResult, translationsResult] = await Promise.all([
    themeService.getPublished().catch((error) => {
      logServerRenderDiagnostic("CmsPageRenderer.theme", error);
      return null;
    }),
    needsLocales
      ? localeService.listEnabled().catch((error) => {
          logServerRenderDiagnostic("CmsPageRenderer.listEnabledLocales", error);
          return FALLBACK_LOCALES;
        })
      : Promise.resolve(null),
    needsTranslations
      ? translationService.getForEntity("CmsPage", page.id).catch((error) => {
          logServerRenderDiagnostic("CmsPageRenderer.pageTranslations", error);
          return [] as EntityTranslation[];
        })
      : Promise.resolve(null),
  ]);

  theme = themeResult;
  if (localesResult) enabledLocales = localesResult;
  if (translationsResult) pageTranslations = translationsResult;

  try {
    headerWorkspace = await withTimeout(
      "CmsPageRenderer.headerWorkspace",
      navigationService.getWorkspaceForSite(
        theme
          ? {
              logoUrl: theme.logoUrl,
              brandConfig: theme.brandConfig,
              siteName: theme.brandConfig?.brandName,
              tagline: theme.brandConfig?.tagline,
            }
          : undefined,
        locale,
      ),
      HEADER_WORKSPACE_TIMEOUT_MS,
    );
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    console.warn(`[CmsPageRenderer] /${slug} nav fallback:`, errMsg);
  }
  const pageHeaderOverlay = resolvePageHeaderOverlay(headerWorkspace.settings, blocks);
  const overlayActive = isPageHeaderOverlayActive(headerWorkspace.settings, blocks);
  const pageVisual = parsePageVisualSettings(
    "visualSettings" in page ? (page as CmsPage & { visualSettings?: unknown }).visualSettings : {},
  );
  const resolved =
    theme != null ? resolveVisualExperience({ site: theme, page: pageVisual }) : null;

  let blockContent: ReactNode = null;
  if (blocks.length > 0) {
    try {
      blockContent = await BlockRenderer({
        blocks,
        locale,
        lazyLoad: slug === "home" ? false : (theme?.lazyLoadEnabled ?? true),
        parentType: "CmsPage",
        parentId: page.id,
        translationBundle: resolvedTranslationBundle,
        pageHeaderOverlay,
        theme,
        siteTextEffect: resolved?.textEffect ?? null,
        pageAnimationsEnabled: resolved?.animationsEnabled,
        discoveryAnchor: { context: "page", slug: page.slug, id: page.id },
      });
    } catch (error) {
      console.error(`[CmsPageRenderer] block render failed for /${slug}:`, error);
      blockContent = (
        <div className="section-padding container-premium">
          <h1 className="font-heading text-4xl font-bold">
            {getLocalizedField(page, "title", locale, {
              enabledLocales,
              translations: pageTranslations,
            })}
          </h1>
          <p className="mt-4 text-lg text-muted-foreground">
            {getLocalizedField(page, "excerpt", locale, {
              enabledLocales,
              translations: pageTranslations,
            }) || "This page is temporarily unavailable. Please try again shortly."}
          </p>
        </div>
      );
    }
  }

  return (
    <VisualExperienceProvider site={theme} page={pageVisual}>
      <article
      {...(overlayActive
        ? {
            "data-page-header-overlay": "true",
            "data-page-header-overlay-surface": pageHeaderOverlay?.surface ?? "glass",
          }
        : {})}
    >
      {blocks.length > 0 ? (
        blockContent
      ) : (
        <div className="section-padding container-premium">
          <h1 className="font-heading text-4xl font-bold">
            {getLocalizedField(page, "title", locale, {
              enabledLocales,
              translations: pageTranslations,
            })}
          </h1>
          {getLocalizedField(page, "excerpt", locale, {
            enabledLocales,
            translations: pageTranslations,
          }) && (
            <p className="mt-4 text-lg text-muted-foreground">
              {getLocalizedField(page, "excerpt", locale, {
                enabledLocales,
                translations: pageTranslations,
              })}
            </p>
          )}
        </div>
      )}
    </article>
    </VisualExperienceProvider>
  );
  } catch (error) {
    const message = getErrorMessage(error);
    const recoverable = isRecoverableDbError(error);
    console.error(`[CmsPageRenderer] /${slug} uncaught failure:`, message);
    if (recoverable) {
      return renderCmsDegradationResponse(slug, locale, { skipLive: true });
    }
    throw error;
  }
}
