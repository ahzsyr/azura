import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import type { Locale } from "@/i18n/routing";
import type { CmsPage, EntityTranslation } from "@prisma/client";
import { cmsService } from "@/features/cms/cms.service";
import {
  pageHeaderOverlayDataAttributes,
  resolvePageHeaderOverlay,
  resolveHeroBlock,
  firstBlockSupportsHeaderOverlay,
} from "@/features/builder/header-overlay";
import { createEmptyWorkspace } from "@/features/navigation/defaults";
import { navigationService } from "@/features/navigation/navigation.service";
import { resolvePublishedSiteTheme } from "@/lib/theme/resolve-site-theme.server";
import type { PageBlocks } from "@/types/builder";
import { getLocalizedField } from "@/lib/utils";
import type { TranslationBundle } from "@/features/translation/translation-bundle";
import { getBundleTranslations, loadPageTranslationBundle } from "@/features/translation/translation-bundle";
import { localeService } from "@/features/i18n/locale.service";
import { translationService } from "@/features/translation/translation.service";
import { parsePageVisualSettings } from "@/schemas/visual-settings";
import { resolveVisualExperience } from "@/features/theme/visual-experience-resolver";
import { VisualExperienceProvider } from "@/components/theme/visual-experience-provider";
import { ProductQuickViewProvider } from "@/features/products/quick-view/product-quick-view-provider";
import { FALLBACK_LOCALES } from "@/i18n/locale-config";
import { logServerRenderDiagnostic } from "@/lib/debug/server-render-log";
import { getErrorMessage, isRecoverableDbError } from "@/lib/debug/recoverable-db-error";
import { renderCmsDegradationResponse } from "@/features/cms/components/cms-degradation-response";
import { compositionService } from "@/features/layout-engine/composition.service";
import { hasRenderableCompositionBlocks } from "@/features/layout-engine/composition-editor-helpers";
import { LayoutRenderer } from "@/features/layout-engine/components/layout-renderer";

type Props = {
  slug: string;
  locale: Locale;
  page?: CmsPage | null;
  translationBundle?: TranslationBundle;
  pageTranslations?: EntityTranslation[];
  /** Second-chance render from degradation path — further failures use terminal fallback only. */
  fromDegradation?: boolean;
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
  fromDegradation = false,
}: Props): Promise<ReactNode> {
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
        return await renderCmsDegradationResponse(slug, locale, {
          skipLive: true,
          terminal: fromDegradation,
        });
      }
      throw error;
    }

  let composition = compositionService.load({
    composition: "composition" in page ? (page as CmsPage & { composition?: unknown }).composition : undefined,
    blocks: page.blocks as PageBlocks,
  });

  // Guard: home page must always render full-width. If the composition was
  // accidentally saved with a sidebar layout, coerce it to "full" at render
  // time so blocks don't duplicate across columns while the deploy-time DB
  // patch hasn't run yet.
  if (slug === "home" && composition.layout.type !== "full") {
    console.warn(
      `[CmsPageRenderer] home page has unexpected layout '${composition.layout.type}' — coercing to full`,
    );
    composition = {
      ...composition,
      layout: { ...composition.layout, type: "full" },
    };
  }

  const blocks = composition.regions.primary;

  const resolvedTranslationBundle =
    translationBundle ??
    (await loadPageTranslationBundle("CmsPage", page.id, composition).catch((error) => {
      logServerRenderDiagnostic("CmsPageRenderer.translationBundle", error);
      return undefined;
    }));

  let siteTokens: Awaited<ReturnType<typeof resolvePublishedSiteTheme>>["tokens"] | null = null;
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
    resolvePublishedSiteTheme().catch((error) => {
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

  siteTokens = themeResult?.tokens ?? null;
  if (localesResult) enabledLocales = localesResult;
  if (translationsResult) pageTranslations = translationsResult;

  try {
    headerWorkspace = await withTimeout(
      "CmsPageRenderer.headerWorkspace",
      navigationService.getWorkspaceForSite(
        siteTokens
          ? {
              logoUrl: siteTokens.logoUrl,
              brandConfig: siteTokens.brandConfig,
              siteName: siteTokens.brandConfig?.brandName,
              tagline: siteTokens.brandConfig?.tagline,
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
  const heroBlock = resolveHeroBlock(composition, composition.layout.type);
  const pageHeaderOverlay = resolvePageHeaderOverlay(headerWorkspace.settings, blocks, {
    composition,
    layoutType: composition.layout.type,
  });
  const hasUnderlay = firstBlockSupportsHeaderOverlay(heroBlock);
  const effectiveOverlay =
    pageHeaderOverlay?.enabled && hasUnderlay ? pageHeaderOverlay : null;
  const pageVisual = parsePageVisualSettings(
    "visualSettings" in page ? (page as CmsPage & { visualSettings?: unknown }).visualSettings : {},
  );
  const resolved =
    siteTokens != null ? resolveVisualExperience({ site: siteTokens, page: pageVisual }) : null;
  const hasRenderableBlocks = hasRenderableCompositionBlocks(composition);

  let blockContent: ReactNode = null;
  if (hasRenderableBlocks) {
    try {
      blockContent = await LayoutRenderer({
        composition,
        renderOptions: { locale },
        parentType: "CmsPage",
        parentId: page.id,
        translationBundle: resolvedTranslationBundle,
        pageHeaderOverlay: effectiveOverlay,
        theme: siteTokens,
        siteTextEffect: resolved?.textEffect ?? null,
        pageAnimationsEnabled: resolved?.animationsEnabled,
        discoveryAnchor: { context: "page", slug: page.slug, id: page.id },
        previewMode: false,
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
    <VisualExperienceProvider site={siteTokens} page={pageVisual} syncGlobally={false}>
      <ProductQuickViewProvider>
        <article
          {...pageHeaderOverlayDataAttributes(pageHeaderOverlay, { hasUnderlay })}
        >
          {hasRenderableBlocks ? (
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
      </ProductQuickViewProvider>
    </VisualExperienceProvider>
  );
  } catch (error) {
    const message = getErrorMessage(error);
    const recoverable = isRecoverableDbError(error);
    const digest = (error as { digest?: string })?.digest ?? null;
    const errorName =
      (error as { name?: string })?.name ??
      (error as { constructor?: { name?: string } })?.constructor?.name ??
      "Error";
    console.error(`[CmsPageRenderer] /${slug} uncaught failure:`, {
      message,
      digest,
      errorName,
      recoverable,
    });
    if (recoverable) {
      return await renderCmsDegradationResponse(slug, locale, {
        skipLive: true,
        terminal: fromDegradation,
      });
    }
    console.error(`[CmsPageRenderer] /${slug} non-recoverable error — serving degradation UI`);
    return await renderCmsDegradationResponse(slug, locale, {
      skipLive: true,
      terminal: fromDegradation,
    });
  }
}
