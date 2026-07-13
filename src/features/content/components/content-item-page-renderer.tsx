import type { ReactNode } from "react";
import type { Locale } from "@/i18n/routing";
import type { ContentItemView, ContentTypeView } from "@/features/content/content-public.types";
import {
  firstBlockSupportsHeaderOverlay,
  pageHeaderOverlayDataAttributes,
  resolveHeroBlock,
  resolvePageHeaderOverlay,
} from "@/features/builder/header-overlay";
import { createEmptyWorkspace } from "@/features/navigation/defaults";
import { navigationService } from "@/features/navigation/navigation.service";
import { resolvePublishedSiteTheme } from "@/lib/theme/resolve-site-theme.server";
import { loadPageTranslationBundle } from "@/features/translation/translation-bundle";
import { parsePageVisualSettings } from "@/schemas/visual-settings";
import { resolveVisualExperience } from "@/features/theme/visual-experience-resolver";
import { VisualExperienceProvider } from "@/components/theme/visual-experience-provider";
import { ProductQuickViewProvider } from "@/features/products/quick-view/product-quick-view-provider";
import { PageSeoJsonLd } from "@/features/seo/components/page-seo-jsonld";
import { getLocalizedField } from "@/lib/utils";
import { FALLBACK_LOCALES } from "@/i18n/locale-config";
import { localeService } from "@/features/i18n/locale.service";
import { logServerRenderDiagnostic } from "@/lib/debug/server-render-log";
import { compositionService } from "@/features/layout-engine/composition.service";
import { hasRenderableCompositionBlocks } from "@/features/layout-engine/composition-editor-helpers";
import { LayoutRenderer } from "@/features/layout-engine/components/layout-renderer";

type Props = {
  locale: string;
  contentType: ContentTypeView;
  item: ContentItemView;
  path: string;
};

export async function ContentItemPageRenderer({ locale, contentType, item, path }: Props) {
  const composition = compositionService.load({
    composition: item.composition,
    blocks: item.blocks ?? [],
  });
  const blocks = composition.regions.primary;
  const coverUrl = item.media.find((m) => m.isCover)?.url ?? item.media[0]?.url;
  const heroBlock = resolveHeroBlock(composition, composition.layout.type);
  const hasUnderlay = Boolean(coverUrl) || firstBlockSupportsHeaderOverlay(heroBlock);

  const [resolvedSiteTheme, translationBundle, enabledLocales, headerWorkspace] = await Promise.all([
    resolvePublishedSiteTheme().catch((error) => {
      logServerRenderDiagnostic("ContentItemPageRenderer.theme", error);
      return null;
    }),
    loadPageTranslationBundle("ContentItem", item.id, composition).catch((error) => {
      logServerRenderDiagnostic("ContentItemPageRenderer.translationBundle", error);
      return undefined;
    }),
    localeService.listEnabled().catch((error) => {
      logServerRenderDiagnostic("ContentItemPageRenderer.locales", error);
      return FALLBACK_LOCALES;
    }),
    navigationService.getWorkspaceForSite(undefined, locale as Locale).catch((error) => {
      logServerRenderDiagnostic("ContentItemPageRenderer.headerWorkspace", error);
      return createEmptyWorkspace();
    }),
  ]);

  const siteTokens = resolvedSiteTheme?.tokens ?? null;
  const pageVisual = parsePageVisualSettings(item.visualSettings ?? {});
  const resolved = siteTokens != null ? resolveVisualExperience({ site: siteTokens, page: pageVisual }) : null;
  const pageHeaderOverlay = resolvePageHeaderOverlay(headerWorkspace.settings, blocks, {
    composition,
    layoutType: composition.layout.type,
  });
  const effectiveOverlay =
    pageHeaderOverlay?.enabled && hasUnderlay ? pageHeaderOverlay : null;
  const hasRenderableBlocks = hasRenderableCompositionBlocks(composition);

  let blockContent: ReactNode = null;
  if (hasRenderableBlocks) {
    try {
      blockContent = await LayoutRenderer({
        composition,
        renderOptions: { locale: locale as Locale },
        parentType: "ContentItem",
        parentId: item.id,
        translationBundle,
        pageHeaderOverlay: effectiveOverlay,
        theme: siteTokens,
        siteTextEffect: resolved?.textEffect ?? null,
        pageAnimationsEnabled: resolved?.animationsEnabled,
        discoveryAnchor: {
          context: "contentItem",
          id: item.id,
          slug: item.slug ?? "",
          contentTypeSlug: item.contentTypeSlug,
          categorySlugs: item.collection ? [item.collection.slug] : [],
          tags: [],
        },
        previewMode: false,
      });
    } catch (error) {
      console.error(`[ContentItemPageRenderer] block render failed for ${path}:`, error);
    }
  }

  const itemTitle = getLocalizedField(
    { titleEn: item.titleEn, titleAr: item.titleAr },
    "title",
    locale,
    { enabledLocales }
  ) || item.title;

  return (
    <VisualExperienceProvider site={siteTokens} page={pageVisual} syncGlobally={false}>
      <ProductQuickViewProvider>
        <PageSeoJsonLd
          locale={locale as Locale}
          path={path}
          entityType="CONTENT_ITEM"
          entityId={item.id}
          fallback={{
            title: itemTitle,
            description: (item.description || item.excerpt).slice(0, 160),
          }}
          ogImage={coverUrl}
        />
        <article {...pageHeaderOverlayDataAttributes(pageHeaderOverlay, { hasUnderlay })}>
          {hasRenderableBlocks ? (
            blockContent
          ) : (
            <div className="section-padding container-premium">
              <h1 className="font-heading text-4xl font-bold">{itemTitle}</h1>
              {(item.excerpt || item.description) && (
                <p className="mt-4 text-lg text-muted-foreground">
                  {item.excerpt || item.description}
                </p>
              )}
            </div>
          )}
        </article>
      </ProductQuickViewProvider>
    </VisualExperienceProvider>
  );
}
