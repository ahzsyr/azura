import type { ReactNode } from "react";
import Image from "next/image";
import { getTranslations } from "next-intl/server";
import type { Locale } from "@/i18n/routing";
import type { BlockNode, PageBlocks } from "@/types/builder";
import type { ResolvedHeaderOverlay } from "@/features/navigation/types";
import { cn } from "@/lib/utils";
import {
  logBlockRenderFailure,
  logServerRenderDiagnostic,
} from "@/lib/debug/server-render-log";
import {
  getFaqSetBySlug,
  getGalleryBySlug,
  resolveTestimonialsForBlock,
} from "@/lib/data";
import { TestimonialsSection } from "@/components/marketing/testimonials-section";
import { CatalogBlockRenderer } from "@/features/catalog/components/catalog-block-renderer";
import { getBlockSettings } from "@/features/builder/instance/block-instance";
import { migrateBlocksToBlockSystem } from "@/features/builder/migration/upgrade-blocks";
import { BlockWrapper } from "@/features/builder/components/block-wrapper";
import { ContentListBlockRenderer } from "@/features/content/components/content-list-block-renderer";
import { mergeDisplaySettings } from "@/schemas/catalog/display-settings";
import { resolveContentOverflowCssFlags } from "@/features/builder/styles/content-overflow-resolver";
import { resolveOverflowContextForBlock } from "@/features/builder/lib/block-overflow-context";
import type { BlockOverflowContext } from "@/features/builder/components/marketing-items-overflow";
import type { DeviceBreakpoint } from "@/types/block-system";
import { FaqItemsOverflow } from "@/features/builder/components/faq-items-overflow";
import { GalleryItemsOverflow } from "@/features/builder/components/gallery-items-overflow";
import { FAQAccordion } from "@/components/marketing/faq-accordion";
import { Section, SectionHeader } from "@/components/marketing/section";
import { RowSectionView } from "@/features/builder/components/row-section-view";
import { GalleryBlockGrid } from "@/components/marketing/gallery-block-grid";
import { normalizeGalleryColumns } from "@/features/gallery/lib/gallery-layout";
import { InquiryForm } from "@/components/forms/inquiry-form";
import { getLocalizedField } from "@/lib/utils";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { localeService } from "@/features/i18n/locale.service";
import { translationService } from "@/features/translation/translation.service";
import {
  applyResolvedBlockCopyToProps,
  collectBlockEntityIds,
  indexBlockTranslationsByBlockId,
  type BlockParentType,
  type BlockTranslationMap,
} from "@/features/translation/block-translation";
import type { PublicLocale } from "@/i18n/locale-config";
import type { EntityTranslation } from "@prisma/client";
import type { TranslationBundle } from "@/features/translation/translation-bundle";
import { getBlockTranslationsFromBundle } from "@/features/translation/translation-bundle";
import type { ThemeTokens } from "@/types/theme";
import { resolveBlockHeadingTextEffect } from "@/features/theme/visual-experience-resolver";
import { parseHeroAnimations } from "@/features/builder/blocks/marketing/lib/hero-animations";
import {
  hasActiveBlockVisualBackground,
  resolveMarketingBackgroundType,
} from "@/features/builder/components/block-style-utils";
import {
  AdvancedRichTextView,
  CodeBlockView,
  MarkdownContent,
  TableBlockIsland,
  TimelineBlockView,
} from "@/features/builder/blocks/content/views";
import { getCustomHtmlElements } from "@/features/builder/blocks/content/custom-html/get-elements";
import { CustomHtmlView } from "@/features/builder/blocks/content/custom-html/components/custom-html-view";
import {
  ChangelogBlockRenderer,
  ComparisonBlockRenderer,
} from "@/features/builder/blocks/content/renderers";
import {
  ProductGridBlockRenderer,
  ProductCarouselBlockRenderer,
  ProductComparisonBlockRenderer,
  ProductSpecificationsBlockRenderer,
  ProductReviewsBlockRenderer,
  ProductFaqBlockRenderer,
  RelatedProductsBlockRenderer,
} from "@/features/builder/blocks/commerce/product-blocks/renderers";
import {
  SearchBlockRenderer,
  AdvancedFiltersBlockRenderer,
  CategoryExplorerBlockRenderer,
  RelatedContentBlockRenderer,
  RecentlyViewedBlockRenderer,
} from "@/features/builder/blocks/discovery/renderers";
import {
  ProductShowcaseBlockRenderer,
  CategoryShowcaseBlockRenderer,
  BrandShowcaseBlockRenderer,
  TaxonomyProductTabsRenderer,
  MegaCollectionBlockRenderer,
  ProductDiscoveryBlockRenderer,
} from "@/features/builder/blocks/commerce/commerce-showcase/renderers";
import {
  VideoHeroBlockRenderer,
  VideoGalleryBlockRenderer,
  InteractiveHotspotsBlockRenderer,
  MasonryGalleryBlockRenderer,
} from "@/features/builder/blocks/media/renderers";
import { MasonryGalleryView } from "@/features/builder/blocks/media/components/masonry-gallery-view";
import type { DiscoveryAnchorContext } from "@/features/builder/blocks/discovery/lib/recently-viewed.types";
import { AnnouncementBarBlockRenderer } from "@/features/announcement-bar/announcement-bar-block-renderer";
import {
  StickyCtaBlockRenderer,
  LeadFormBlockRenderer,
  ContactFormBuilderBlockRenderer,
  MultiStepFormBlockRenderer,
  NewsletterSignupBlockRenderer,
  DownloadGateBlockRenderer,
} from "@/features/builder/blocks/conversion/renderers";
import {
  PricingCalculatorBlockRenderer,
  KnowledgeBaseBlockRenderer,
  DocumentationNavBlockRenderer,
  StatusDashboardBlockRenderer,
  TeamDirectoryBlockRenderer,
  PartnerDirectoryBlockRenderer,
  PricingTableBlockRenderer,
} from "@/features/builder/blocks/portal/renderers";
import {
  HeroProView,
  CtaBannerView,
  FeatureGridView,
  BenefitsGridView,
  TrustBadgesView,
  LogoCloudView,
  StatsCounterView,
  BeforeAfterView,
} from "@/features/builder/blocks/marketing/views";
import type {
  GridItem,
  TrustBadgeItem,
  LogoItem,
  StatItem,
} from "@/features/builder/blocks/marketing/schemas/marketing-blocks";

type Props = {
  blocks: PageBlocks;
  locale: Locale;
  lazyLoad?: boolean;
  previewMode?: boolean;
  parentType?: BlockParentType;
  parentId?: string;
  translationBundle?: TranslationBundle;
  pageHeaderOverlay?: ResolvedHeaderOverlay | null;
  theme?: ThemeTokens | null;
  siteTextEffect?: string | null;
  pageAnimationsEnabled?: boolean;
  discoveryAnchor?: DiscoveryAnchorContext | null;
  /** Builder device preview — applies per-device overflow layout */
  previewDevice?: DeviceBreakpoint;
};

type RenderContext = {
  locale: Locale;
  enabledLocales: PublicLocale[];
  translationsByBlockId: BlockTranslationMap;
  lazyLoad?: boolean;
  previewMode?: boolean;
  theme?: ThemeTokens | null;
  siteTextEffect?: string | null;
  pageAnimationsEnabled?: boolean;
  discoveryAnchor?: DiscoveryAnchorContext | null;
  tGallery: Awaited<ReturnType<typeof getTranslations>>;
  tPackages: Awaited<ReturnType<typeof getTranslations>>;
  tTestimonials: Awaited<ReturnType<typeof getTranslations>>;
  previewDevice?: DeviceBreakpoint;
};

function blockLoc(
  props: Record<string, unknown>,
  field: string,
  blockId: string,
  ctx: RenderContext
): string {
  return getLocalizedField(props, field, ctx.locale, {
    enabledLocales: ctx.enabledLocales,
    translations: ctx.translationsByBlockId.get(blockId),
    includeLegacySuffixFields: true,
  });
}

function sectionVariant(background: unknown): "default" | "muted" | "dark" {
  if (background === "muted") return "muted";
  if (background === "primary") return "dark";
  return "default";
}

function sectionPaddingClass(padding: unknown): string {
  if (padding === "none") return "!py-0";
  if (padding === "large") return "!py-24 md:!py-32";
  return "";
}

function heroOverlayClass(overlayActive: boolean): string {
  return overlayActive ? "block-first-with-header-overlay" : "";
}

function normalizeCatalogSource(value: unknown): "packages" | "hotels" | "services" {
  if (value === "catalog-items") return "packages";
  if (value === "listings") return "hotels";
  if (value === "offerings") return "services";
  if (value === "packages" || value === "hotels" || value === "services") return value;
  return "packages";
}

async function renderBlockContent(
  block: BlockNode,
  ctx: RenderContext,
  options?: {
    firstBlockOverlayActive?: boolean;
    siteTextEffect?: string | null;
    isFirstBlock?: boolean;
  },
): Promise<ReactNode> {
  const p = getBlockSettings(block);
  const lp = applyResolvedBlockCopyToProps(p, block.type, {
    locale: ctx.locale,
    enabledLocales: ctx.enabledLocales,
    translations: ctx.translationsByBlockId.get(block.id),
  });
  const { locale, lazyLoad, enabledLocales, previewMode } = ctx;
  const loc = (field: string) => blockLoc(p, field, block.id, ctx);
  const overlayClass = heroOverlayClass(Boolean(options?.firstBlockOverlayActive));
  const headingEffect = resolveBlockHeadingTextEffect(
    block.visual,
    options?.siteTextEffect ?? ctx.siteTextEffect ?? null,
  );
  const overflow = resolveOverflowContextForBlock(block, ctx.previewDevice);

  switch (block.type) {
    case "hero": {
      const hasHeroImage = Boolean(p.imageUrl);
      const useBlockVisualBg = hasActiveBlockVisualBackground(block);
      const siteBgEffect =
        ctx.theme?.backgroundEffectEnabled !== false && ctx.theme?.backgroundEffect;
      const resolvedBgType = resolveMarketingBackgroundType(
        block,
        (p.backgroundType as string) ?? (hasHeroImage ? "image" : "transparent"),
        "image"
      );
      const useTransparentHero =
        resolvedBgType === "transparent" &&
        !hasHeroImage &&
        !useBlockVisualBg &&
        Boolean(siteBgEffect);
      const secondaryLabel = loc("secondaryCtaLabel");
      const heroAnimations = parseHeroAnimations(p.animations);
      const background = (p.background as Record<string, unknown> | undefined) ?? {};
      const imagePosition = (background.imagePosition as string) ?? "cover";
      return (
        <HeroProView
          title={loc("title")}
          subtitle={loc("subtitle") || undefined}
          badge={loc("badge") || undefined}
          imageUrl={(p.imageUrl as string) || undefined}
          foregroundImageUrl={(p.foregroundImageUrl as string) || undefined}
          videoUrl={(p.videoUrl as string) || undefined}
          backgroundType={useTransparentHero ? "transparent" : resolvedBgType}
          layout={(p.layout as string) ?? "centered"}
          align={(p.align as string) ?? "center"}
          minHeight={(p.minHeight as string) ?? "70vh"}
          overlayOpacity={Number(p.overlayOpacity ?? 60)}
          primaryCta={
            loc("ctaLabel") && p.ctaHref
              ? { label: loc("ctaLabel"), href: p.ctaHref as string }
              : undefined
          }
          secondaryCta={
            secondaryLabel && p.secondaryCtaHref
              ? {
                  label: secondaryLabel,
                  href: p.secondaryCtaHref as string,
                  variant: (p.secondaryCtaVariant as "outline" | "ghost" | "gold") ?? "outline",
                }
              : undefined
          }
          headingEffect={headingEffect}
          heroAnimations={heroAnimations}
          imagePosition={imagePosition}
          overlayClass={overlayClass}
          lazyLoad={options?.isFirstBlock ? false : lazyLoad}
          useTransparentHero={useTransparentHero}
          useBlockVisualBg={useBlockVisualBg}
        />
      );
    }

    case "text": {
      const content = loc("content") || "";
      const title = loc("title") || "";
      const headerAlign = (p.align as string) === "left" || (p.align as string) === "start" ? "start" : "center";
      const contentAlign =
        (p.contentAlign as string) === "center" ? "text-center" : "text-left";
      const badgeSizeClass =
        (p.badgeSize as string) === "xs"
          ? "text-[10px]"
          : (p.badgeSize as string) === "base"
            ? "text-sm"
            : "text-xs";
      const titleSizeClass =
        (p.titleSize as string) === "xl"
          ? "text-2xl md:text-3xl lg:text-4xl"
          : (p.titleSize as string) === "3xl"
            ? "text-4xl md:text-5xl lg:text-6xl"
            : "text-3xl md:text-4xl lg:text-5xl";
      const subtitleSizeClass =
        (p.subtitleSize as string) === "sm"
          ? "text-sm md:text-base"
          : (p.subtitleSize as string) === "lg"
            ? "text-lg md:text-xl"
            : "text-base md:text-lg";
      const contentSizeClass =
        (p.contentSize as string) === "sm"
          ? "text-sm"
          : (p.contentSize as string) === "lg"
            ? "text-lg"
            : "text-base";
      const looksLikeHtml = /<[a-z][\s\S]*>/i.test(content);
      return (
        <Section suppressAtmosphere variant="solid">
          {title && (
            <SectionHeader
              badge={loc("badge") || undefined}
              title={title}
              subtitle={loc("subtitle") || undefined}
              align={headerAlign}
              badgeClassName={badgeSizeClass}
              titleClassName={titleSizeClass}
              subtitleClassName={subtitleSizeClass}
            />
          )}
          {content && (
            <div className={cn("prose prose-zinc max-w-none mx-auto dark:prose-invert", contentAlign)}>
              {looksLikeHtml ? (
                <div
                  className={cn("leading-relaxed text-muted-foreground", contentSizeClass)}
                  dangerouslySetInnerHTML={{ __html: content }}
                />
              ) : (
                <p className={cn("text-muted-foreground whitespace-pre-wrap", contentSizeClass)}>
                  {content}
                </p>
              )}
            </div>
          )}
        </Section>
      );
    }

    case "gallery": {
      const slug = (p.gallerySlug as string) || "";
      const sectionTitle = loc("title");
      if (!slug) {
        return (
          <Section>
            {sectionTitle ? <SectionHeader title={sectionTitle} /> : null}
            <p className="text-center text-sm text-muted-foreground">
              {previewMode ? "No gallery linked." : "Gallery content will appear here once a gallery album is selected in the page editor."}
            </p>
          </Section>
        );
      }
      const album = await getGalleryBySlug(slug);
      if (!album) {
        return (
          <Section>
            {sectionTitle ? <SectionHeader title={sectionTitle} /> : null}
            <p className="text-center text-sm text-muted-foreground">
              Gallery album &quot;{slug}&quot; is unavailable or not published.
            </p>
          </Section>
        );
      }
      const limit = Number(p.limit ?? 0);
      const media = limit > 0 ? album.media.slice(0, limit) : album.media;
      const cols = normalizeGalleryColumns(p.columns);
      const variant = (p.variant as "grid" | "masonry") ?? "grid";
      const resolvedTitle =
        loc("title") || getLocalizedField(album, "title", locale, { enabledLocales });

      if (variant === "masonry") {
        return (
          <Section>
            <MasonryGalleryView
              title={resolvedTitle || undefined}
              albumMedia={media}
              columns={cols}
              enableLightbox
              enableFilter={false}
              lazyLoad={lazyLoad}
              locale={locale}
              block={block}
              overflow={overflow}
            />
            {p.showViewAllLink !== false && slug && (
              <div className="mt-8 text-center">
                <Button asChild variant="outline">
                  <Link href={`/gallery/${slug}`}>{ctx.tGallery("viewAll")}</Link>
                </Button>
              </div>
            )}
          </Section>
        );
      }

      return (
        <Section>
          {resolvedTitle && <SectionHeader title={resolvedTitle} />}
          <div className={resolvedTitle ? "mt-8" : undefined}>
            {overflow ? (
              <GalleryItemsOverflow
                media={media}
                columns={cols}
                locale={locale}
                lazyLoad={lazyLoad}
                variant="grid"
                block={block}
                overflow={overflow}
              />
            ) : (
              <GalleryBlockGrid
                media={media}
                columns={cols}
                locale={locale}
                lazyLoad={lazyLoad}
                variant="grid"
              />
            )}
          </div>
          {p.showViewAllLink !== false && slug && (
            <div className="mt-8 text-center">
              <Button asChild variant="outline">
                <Link href={`/gallery/${slug}`}>{ctx.tGallery("viewAll")}</Link>
              </Button>
            </div>
          )}
        </Section>
      );
    }

    case "pricing":
      return (
        <PricingTableBlockRenderer
          locale={locale}
          props={lp}
          loc={loc}
          block={block}
          overflow={overflow}
        />
      );

    case "image": {
      const url = (p.url as string) || "";
      const imageTitle = loc("title") || "";
      const imageDescription = loc("description") || "";
      const headerAlign = (p.align as string) === "left" || (p.align as string) === "start" ? "start" : "center";
      const descriptionAlign =
        (p.descriptionAlign as string) === "left" || (p.descriptionAlign as string) === "start"
          ? "text-left"
          : "text-center";
      const badgeSizeClass =
        (p.badgeSize as string) === "xs"
          ? "text-[10px]"
          : (p.badgeSize as string) === "base"
            ? "text-sm"
            : "text-xs";
      const titleSizeClass =
        (p.titleSize as string) === "xl"
          ? "text-2xl md:text-3xl lg:text-4xl"
          : (p.titleSize as string) === "3xl"
            ? "text-4xl md:text-5xl lg:text-6xl"
            : "text-3xl md:text-4xl lg:text-5xl";
      const subtitleSizeClass =
        (p.subtitleSize as string) === "sm"
          ? "text-sm md:text-base"
          : (p.subtitleSize as string) === "lg"
            ? "text-lg md:text-xl"
            : "text-base md:text-lg";
      const descriptionSizeClass =
        (p.descriptionSize as string) === "sm"
          ? "text-sm"
          : (p.descriptionSize as string) === "lg"
            ? "text-lg"
            : "text-base";
      if (!url && !imageTitle) return null;
      return (
        <Section>
          {imageTitle && (
            <SectionHeader
              badge={loc("badge") || undefined}
              title={imageTitle}
              subtitle={loc("subtitle") || undefined}
              align={headerAlign}
              badgeClassName={badgeSizeClass}
              titleClassName={titleSizeClass}
              subtitleClassName={subtitleSizeClass}
            />
          )}
          {url && (
            <div className="relative aspect-video max-w-4xl mx-auto overflow-hidden rounded-xl">
              <Image
                src={url}
                alt={loc("alt") || ""}
                fill
                className="object-cover"
                loading={lazyLoad ? "lazy" : "eager"}
              />
            </div>
          )}
          {imageDescription && (
            <p
              className={cn(
                "mt-6 leading-relaxed text-foreground/70 max-w-2xl mx-auto",
                descriptionSizeClass,
                descriptionAlign
              )}
            >
              {imageDescription}
            </p>
          )}
        </Section>
      );
    }

    case "catalog": {
      const settings = mergeDisplaySettings(p.displaySettings as Record<string, unknown>);
      const catalogContent = await CatalogBlockRenderer({
        locale,
        title: loc("title") || undefined,
        subtitle: loc("subtitle") || undefined,
        config: {
          source: normalizeCatalogSource(p.source),
          categorySlug: (p.categorySlug as string) || undefined,
          city: (p.city as string) || undefined,
          serviceType: (p.serviceType as string) || undefined,
          featuredOnly: Boolean(p.featuredOnly),
          manualIds: (p.manualIds as string[]) ?? [],
          limit: settings.limit,
        },
        displaySettings: settings,
        viewAllHref: (p.viewAllHref as string) || undefined,
        emptyMessage: loc("emptyMessage") || undefined,
        previewMode,
        block,
        previewDevice: ctx.previewDevice,
      });
      return <Section>{catalogContent}</Section>;
    }

    case "contentList":
      return (
        <Section>
          <ContentListBlockRenderer
            locale={locale}
            props={lp}
            previewMode={previewMode}
            block={block}
            previewDevice={ctx.previewDevice}
          />
        </Section>
      );

    case "testimonials": {
      const items = await resolveTestimonialsForBlock({
        source: p.source as string | undefined,
        testimonialCollectionSlug: p.testimonialCollectionSlug as string | undefined,
        testimonialIds: p.testimonialIds as string[] | undefined,
        limit: p.limit as number | undefined,
      });
      if (items.length === 0) {
        if (previewMode) {
          return (
            <Section>
              <p className="text-center text-sm text-muted-foreground">No testimonials to display.</p>
            </Section>
          );
        }
        return null;
      }
      return (
        <Section>
          <SectionHeader title={loc("title") || ctx.tTestimonials("title")} />
          <div className="mt-8">
            <TestimonialsSection
              items={items}
              locale={locale}
              columns={(p.columns as 2 | 3 | 4) ?? 3}
              layoutMode={(p.layoutMode as "grid" | "slider") ?? "grid"}
              sliderEnabled={Boolean(p.sliderEnabled)}
              cardVariant={(p.cardVariant as "default" | "compact" | "minimal" | "featured") ?? "default"}
              autoplay={Boolean(p.autoplay)}
              autoplayIntervalMs={Number(p.autoplayIntervalMs ?? 5000)}
              showViewAllLink={p.showViewAllLink !== false}
              block={block}
              overflow={overflow}
            />
          </div>
        </Section>
      );
    }

    case "faq": {
      const slug = ((p.faqSetSlug as string) || (p.category as string) || "").trim();
      if (!slug) return null;
      const faqSet = await getFaqSetBySlug(slug);
      if (!faqSet || faqSet.items.length === 0) return null;
      const limit = Number(p.limit ?? 0);
      const faqs = limit > 0 ? faqSet.items.slice(0, limit) : faqSet.items;
      return (
        <Section>
          {Boolean(loc("title")) && <SectionHeader title={loc("title")} />}
          {overflow ? (
            <FaqItemsOverflow faqs={faqs} locale={locale} block={block} overflow={overflow} />
          ) : (
            <FAQAccordion faqs={faqs} locale={locale} />
          )}
        </Section>
      );
    }

    case "cta": {
      const useBlockVisualBg = hasActiveBlockVisualBackground(block);
      return (
        <Section suppressAtmosphere={useBlockVisualBg}>
          <CtaBannerView
            title={loc("title")}
            subtitle={loc("subtitle") || undefined}
            promoBadge={loc("promoBadge") || undefined}
            promoText={loc("promoText") || undefined}
            layout={(p.layout as string) ?? "centered"}
            size={(p.size as string) ?? "default"}
            backgroundType={resolveMarketingBackgroundType(
              block,
              p.backgroundType as string | undefined
            )}
            backgroundImageUrl={(p.backgroundImageUrl as string) || undefined}
            backgroundVideoUrl={(p.backgroundVideoUrl as string) || undefined}
            backgroundColor={(p.backgroundColor as string) || undefined}
            primaryButton={
              loc("button")
                ? { label: loc("button"), href: (p.href as string) || "/contact" }
                : undefined
            }
            secondaryButton={
              loc("secondaryButton") && p.secondaryHref
                ? { label: loc("secondaryButton"), href: p.secondaryHref as string }
                : undefined
            }
            countdownEnabled={Boolean(p.countdownEnabled)}
            countdownTarget={(p.countdownTarget as string) || undefined}
            countdownLabel={loc("countdownLabel") || undefined}
          />
        </Section>
      );
    }

    case "featureGrid":
      return (
        <Section>
          <FeatureGridView
            title={loc("title") || undefined}
            subtitle={loc("subtitle") || undefined}
            columns={(p.columns as 2 | 3 | 4) ?? 3}
            cardVariant={(p.cardVariant as "default" | "bordered" | "elevated" | "iconTop") ?? "default"}
            showCategories={Boolean(p.showCategories)}
            items={(p.items as GridItem[]) ?? []}
            locale={locale}
            enabledLocales={enabledLocales}
            block={block}
            overflow={overflow}
          />
        </Section>
      );

    case "benefitsGrid":
      return (
        <Section>
          <BenefitsGridView
            title={loc("title") || undefined}
            subtitle={loc("subtitle") || undefined}
            layout={(p.layout as "cards" | "list" | "numbered" | "twoColumn") ?? "cards"}
            emphasis={(p.emphasis as "outcome" | "metric") ?? "outcome"}
            items={(p.items as GridItem[]) ?? []}
            locale={locale}
            enabledLocales={enabledLocales}
            block={block}
            overflow={overflow}
          />
        </Section>
      );

    case "announcementBar":
      return (
        <AnnouncementBarBlockRenderer
          locale={locale}
          enabledLocales={enabledLocales}
          props={lp}
          blockId={block.id}
        />
      );

    case "trustBadges":
      return (
        <Section>
          <TrustBadgesView
            title={loc("title") || undefined}
            subtitle={loc("subtitle") || undefined}
            layout={(p.layout as "grid" | "inlineStrip" | "compactRow") ?? "grid"}
            registrationNo={(p.registrationNo as string) || undefined}
            items={(p.items as TrustBadgeItem[]) ?? []}
            locale={locale}
            block={block}
            overflow={overflow}
          />
        </Section>
      );

    case "logoCloud":
      return (
        <Section>
          <LogoCloudView
            title={loc("title") || undefined}
            subtitle={loc("subtitle") || undefined}
            displayMode={(p.displayMode as "grid" | "carousel" | "marquee") ?? "grid"}
            columns={(p.columns as 3 | 4 | 5 | 6) ?? 5}
            grayscale={p.grayscale !== false}
            grayscaleHover={p.grayscaleHover !== false}
            autoplay={p.autoplay !== false}
            autoplayIntervalMs={Number(p.autoplayIntervalMs ?? 4000)}
            logoSize={(p.logoSize as "sm" | "md" | "lg") ?? "md"}
            groupByCategory={Boolean(p.groupByCategory)}
            items={(p.items as LogoItem[]) ?? []}
            locale={locale}
            block={block}
            overflow={overflow}
          />
        </Section>
      );

    case "statsCounter":
      return (
        <Section>
          <StatsCounterView
            title={loc("title") || undefined}
            subtitle={loc("subtitle") || undefined}
            layout={(p.layout as "row" | "grid" | "featuredCenter") ?? "grid"}
            animateOnView={p.animateOnView !== false}
            items={(p.items as StatItem[]) ?? []}
            locale={locale}
            block={block}
            overflow={overflow}
          />
        </Section>
      );

    case "beforeAfter":
      return (
        <Section>
          <BeforeAfterView
            title={loc("title") || undefined}
            subtitle={loc("subtitle") || undefined}
            layout={(p.layout as "slider" | "sideBySide" | "stacked" | "overlay") ?? "slider"}
            beforeLabel={loc("beforeLabel") || undefined}
            afterLabel={loc("afterLabel") || undefined}
            beforeImageUrl={(p.beforeImageUrl as string) || undefined}
            afterImageUrl={(p.afterImageUrl as string) || undefined}
            sliderPosition={Number(p.sliderPosition ?? 50)}
            showLabels={p.showLabels !== false}
          />
        </Section>
      );

    case "inquiryForm":
      return (
        <Section suppressAtmosphere variant="solid">
          {loc("title") ? (
            <SectionHeader title={loc("title")} align="start" />
          ) : null}
          <div className="mx-auto max-w-lg">
            <InquiryForm
              locale={locale}
              type={((p.type as "CONTACT" | "VISA" | "GENERAL") ?? "CONTACT")}
            />
          </div>
        </Section>
      );

    case "richText":
      return (
        <Section>
          <AdvancedRichTextView
            html={loc("html") || ""}
            maxWidth="full"
            prose
          />
        </Section>
      );

    case "customHtml": {
      const elements = getCustomHtmlElements(p, locale);
      if (elements.length === 0) return null;
      return (
        <Section>
          <CustomHtmlView elements={elements} locale={locale} previewMode={previewMode} />
        </Section>
      );
    }

    case "advancedRichText": {
      const maxWidth = (p.maxWidth as "full" | "contained" | "narrow" | "reading") ?? "reading";
      const prose = p.prose !== false;
      const sections = Array.isArray(p.sections) && p.sections.length > 0
        ? (p.sections as Record<string, unknown>[])
        : null;

      if (sections) {
        return (
          <Section>
            <div className="space-y-6">
              {sections.map((sec, i) => {
                const secHtml =
                  getLocalizedField(sec, "html", locale, { enabledLocales, includeLegacySuffixFields: true }) || "";
                if (!secHtml.trim()) return null;
                return (
                  <AdvancedRichTextView
                    key={(sec.id as string) || String(i)}
                    html={secHtml}
                    maxWidth={maxWidth}
                    prose={prose}
                  />
                );
              })}
            </div>
          </Section>
        );
      }

      return (
        <Section>
          <AdvancedRichTextView
            html={loc("html") || getLocalizedField(p, "html", locale, { enabledLocales, includeLegacySuffixFields: true }) || ""}
            maxWidth={maxWidth}
            prose={prose}
          />
        </Section>
      );
    }

    case "markdown":
      return (
        <Section>
          <MarkdownContent
            source={loc("markdown") || getLocalizedField(p, "markdown", locale, { enabledLocales, includeLegacySuffixFields: true }) || ""}
            allowGfm={p.allowGfm !== false}
            prose={p.prose !== false}
          />
        </Section>
      );

    case "code":
      return (
        <Section>
          <CodeBlockView
            code={(p.code as string) ?? ""}
            language={(p.language as string) ?? "typescript"}
            title={loc("title") || undefined}
            showLineNumbers={p.showLineNumbers !== false}
            showCopyButton={p.showCopyButton !== false}
            highlightLines={(p.highlightLines as number[]) ?? []}
          />
        </Section>
      );

    case "table":
      return (
        <Section>
          <TableBlockIsland
            title={loc("title") || undefined}
            columns={
              (p.columns as {
                id: string;
                label: string;
                sortable: boolean;
              }[]) ?? []
            }
            rows={(p.rows as { id: string; cells: Record<string, string> }[]) ?? []}
            features={
              (p.features as {
                sortable: boolean;
                filterable: boolean;
                searchable: boolean;
                paginated: boolean;
                pageSize: number;
              }) ?? {
                sortable: true,
                filterable: false,
                searchable: true,
                paginated: false,
                pageSize: 10,
              }
            }
            striped={p.striped !== false}
            compact={Boolean(p.compact)}
            locale={locale}
          />
        </Section>
      );

    case "timeline":
      return (
        <Section>
          <TimelineBlockView
            title={loc("title") || undefined}
            layout={(p.layout as "vertical" | "horizontal" | "alternating") ?? "vertical"}
            block={block}
            overflow={overflow}
            items={
              (p.items as {
                id: string;
                date: string;
                title: string;
                description: string;
                icon: string;
                imageUrl: string;
                category: string;
              }[]) ?? []
            }
            locale={locale}
          />
        </Section>
      );

    case "changelog":
      return (
        <Section>
          <ChangelogBlockRenderer locale={locale} props={lp} loc={loc} block={block} overflow={overflow} />
        </Section>
      );

    case "productGrid":
      return (
        <Section>
          <ProductGridBlockRenderer
            locale={locale}
            props={lp}
            previewMode={previewMode}
            block={block}
            previewDevice={ctx.previewDevice}
          />
        </Section>
      );

    case "productCarousel":
      return (
        <Section>
          <ProductCarouselBlockRenderer
            locale={locale}
            props={lp}
            previewMode={previewMode}
            block={block}
            previewDevice={ctx.previewDevice}
          />
        </Section>
      );

    case "productComparison":
      return (
        <Section>
          <ProductComparisonBlockRenderer
            locale={locale}
            props={lp}
            previewMode={previewMode}
            block={block}
            overflow={overflow}
          />
        </Section>
      );

    case "productSpecifications":
      return (
        <Section>
          <ProductSpecificationsBlockRenderer locale={locale} props={lp} previewMode={previewMode} />
        </Section>
      );

    case "productReviews":
      return (
        <Section>
          <ProductReviewsBlockRenderer
            locale={locale}
            props={lp}
            previewMode={previewMode}
            block={block}
            overflow={overflow}
          />
        </Section>
      );

    case "productFaq":
      return (
        <Section>
          <ProductFaqBlockRenderer
            locale={locale}
            props={lp}
            previewMode={previewMode}
            block={block}
            overflow={overflow}
          />
        </Section>
      );

    case "relatedProducts":
      return (
        <Section>
          <RelatedProductsBlockRenderer
            locale={locale}
            props={lp}
            previewMode={previewMode}
            block={block}
            previewDevice={ctx.previewDevice}
          />
        </Section>
      );

    case "searchBlock":
      return (
        <Section>
          <SearchBlockRenderer locale={locale} props={lp} previewMode={previewMode} />
        </Section>
      );

    case "advancedFilters":
      return (
        <Section>
          <AdvancedFiltersBlockRenderer locale={locale} props={lp} />
        </Section>
      );

    case "categoryExplorer":
      return (
        <Section>
          <CategoryExplorerBlockRenderer
            locale={locale}
            props={lp}
            previewMode={previewMode}
            block={block}
            overflow={overflow}
          />
        </Section>
      );

    case "relatedContent":
      return (
        <Section>
          <RelatedContentBlockRenderer
            locale={locale}
            props={lp}
            previewMode={previewMode}
            discoveryAnchor={ctx.discoveryAnchor}
            block={block}
            overflow={overflow}
          />
        </Section>
      );

    case "recentlyViewed":
      return (
        <Section>
          <RecentlyViewedBlockRenderer
            locale={locale}
            props={lp}
            previewMode={previewMode}
            block={block}
            overflow={overflow}
          />
        </Section>
      );

    case "categoryShowcase":
      return (
        <Section>
          <CategoryShowcaseBlockRenderer locale={locale} props={lp} previewMode={previewMode} />
        </Section>
      );

    case "brandShowcase":
      return (
        <Section>
          <BrandShowcaseBlockRenderer locale={locale} props={lp} previewMode={previewMode} />
        </Section>
      );

    case "productShowcase":
      return (
        <Section>
          <ProductShowcaseBlockRenderer
            locale={locale}
            props={lp}
            previewMode={previewMode}
            block={block}
            previewDevice={ctx.previewDevice}
          />
        </Section>
      );

    case "taxonomyProductTabs":
      return (
        <Section>
          <TaxonomyProductTabsRenderer
            locale={locale}
            props={lp}
            previewMode={previewMode}
            block={block}
            previewDevice={ctx.previewDevice}
          />
        </Section>
      );

    case "megaCollectionShowcase":
      return (
        <Section>
          <MegaCollectionBlockRenderer
            locale={locale}
            props={lp}
            previewMode={previewMode}
            block={block}
            previewDevice={ctx.previewDevice}
          />
        </Section>
      );

    case "productDiscovery":
      return (
        <Section>
          <ProductDiscoveryBlockRenderer locale={locale} props={lp} previewMode={previewMode} />
        </Section>
      );

    case "videoHero":
      return <VideoHeroBlockRenderer locale={locale} props={lp} overlayClass={overlayClass} />;

    case "videoGallery":
      return (
        <Section>
          <VideoGalleryBlockRenderer
            locale={locale}
            props={lp}
            previewMode={previewMode}
            block={block}
            overflow={overflow}
          />
        </Section>
      );

    case "interactiveHotspots":
      return (
        <Section>
          <InteractiveHotspotsBlockRenderer locale={locale} props={lp} previewMode={previewMode} />
        </Section>
      );

    case "masonryGallery":
      return (
        <Section>
          <MasonryGalleryBlockRenderer
            locale={locale}
            props={lp}
            previewMode={previewMode}
            block={block}
            overflow={overflow}
          />
        </Section>
      );

    case "stickyCta":
      return <StickyCtaBlockRenderer locale={locale} props={lp} loc={loc} />;

    case "leadForm":
      return (
        <LeadFormBlockRenderer locale={locale} props={lp} blockId={block.id} loc={loc} />
      );

    case "contactFormBuilder":
      return (
        <ContactFormBuilderBlockRenderer locale={locale} props={lp} blockId={block.id} loc={loc} />
      );

    case "multiStepForm":
      return (
        <MultiStepFormBlockRenderer locale={locale} props={lp} blockId={block.id} loc={loc} />
      );

    case "newsletterSignup":
      return (
        <NewsletterSignupBlockRenderer locale={locale} props={lp} blockId={block.id} loc={loc} />
      );

    case "downloadGate":
      return (
        <DownloadGateBlockRenderer locale={locale} props={lp} blockId={block.id} loc={loc} />
      );

    case "pricingCalculator":
      return <PricingCalculatorBlockRenderer locale={locale} props={lp} loc={loc} />;

    case "knowledgeBase":
      return <KnowledgeBaseBlockRenderer locale={locale} props={lp} loc={loc} />;

    case "documentationNav":
      return <DocumentationNavBlockRenderer locale={locale} props={lp} loc={loc} />;

    case "statusDashboard":
      return <StatusDashboardBlockRenderer locale={locale} props={lp} loc={loc} />;

    case "teamDirectory":
      return <TeamDirectoryBlockRenderer locale={locale} props={lp} loc={loc} />;

    case "partnerDirectory":
      return <PartnerDirectoryBlockRenderer locale={locale} props={lp} loc={loc} />;

    case "comparison":
      return (
        <Section>
          <ComparisonBlockRenderer
            locale={locale}
            title={loc("title") || undefined}
            source={(p.source as "manual" | "contentType" | "catalog") ?? "manual"}
            layout={(p.layout as "table" | "cards" | "sideBySide") ?? "table"}
            highlightDifferences={p.highlightDifferences !== false}
            columns={
              (p.columns as {
                id: string;
                label: string;
                highlighted: boolean;
              }[]) ?? []
            }
            rows={(p.rows as { id: string; label: string; values: Record<string, string | boolean> }[]) ?? []}
            contentTypeSlug={(p.contentTypeSlug as string) ?? ""}
            itemIds={(p.itemIds as string[]) ?? []}
            catalogSource={(p.catalogSource as "packages" | "hotels" | "services") ?? "packages"}
            attributeKeys={(p.attributeKeys as string[]) ?? []}
            previewMode={previewMode}
            block={block}
            overflow={overflow}
          />
        </Section>
      );

    case "video":
      return p.url ? (
        <Section>
          {Boolean(loc("title")) && <SectionHeader title={loc("title")} />}
          <div className="aspect-video max-w-4xl mx-auto rounded-xl overflow-hidden">
            <iframe src={p.url as string} className="w-full h-full" allowFullScreen title="Video" />
          </div>
          {loc("caption") && <p className="text-center text-sm text-muted-foreground mt-2">{loc("caption")}</p>}
        </Section>
      ) : null;

    case "spacer":
      return <div style={{ height: (p.height as number) ?? 48 }} />;

    case "divider":
      return (
        <hr
          className={
            p.style === "gold"
              ? "border-accent border-t-2 my-8 w-16 mx-auto"
              : p.style === "dashed"
                ? "border-dashed border-border my-8"
                : "border-border my-8"
          }
        />
      );

    case "section":
      return (
        <Section
          variant={sectionVariant(p.background)}
          className={sectionPaddingClass(p.padding)}
        >
          <div className="space-y-0">
            {block.children?.map((child) => (
              <RenderBlock key={child.id} block={child} ctx={ctx} />
            ))}
          </div>
        </Section>
      );

    case "rowSection": {
      const maxColumns = (p.maxColumns as number) ?? 2;
      const visibleChildren = (block.children ?? []).slice(0, maxColumns);
      return (
        <Section
          variant={sectionVariant(p.background)}
          className={sectionPaddingClass(p.padding)}
        >
          <RowSectionView
            maxColumns={maxColumns}
            columnLayout={(p.columnLayout as string) ?? "equal"}
            gap={(p.gap as string) ?? "md"}
            stackOnMobile={(p.stackOnMobile as boolean) ?? true}
            verticalAlign={(p.verticalAlign as string) ?? "stretch"}
          >
            {visibleChildren.map((child) => (
              <div key={child.id} className="row-section-grid__cell min-w-0">
                <RenderBlock block={child} ctx={ctx} />
              </div>
            ))}
          </RowSectionView>
        </Section>
      );
    }

    default:
      return null;
  }
}

async function RenderBlock({
  block,
  ctx,
  isFirstBlock = false,
  firstBlockOverlayActive = false,
  blockIndex = 0,
}: {
  block: BlockNode;
  ctx: RenderContext;
  isFirstBlock?: boolean;
  firstBlockOverlayActive?: boolean;
  blockIndex?: number;
}) {
  let inner: ReactNode = null;
  try {
    inner = await renderBlockContent(block, ctx, {
      firstBlockOverlayActive: isFirstBlock && firstBlockOverlayActive,
      siteTextEffect: ctx.siteTextEffect,
      isFirstBlock,
    });
  } catch (error) {
    logBlockRenderFailure(block.id, block.type, error);
    if (ctx.previewMode) {
      inner = (
        <div className="section-padding container-premium">
          <p className="text-sm text-muted-foreground">
            Block <code className="text-xs">{block.type}</code> could not render in preview.
          </p>
        </div>
      );
    }
  }
  if (inner == null) return null;
  return (
    <BlockWrapper
      block={block}
      ctx={{
        locale: ctx.locale,
        device: ctx.previewDevice ?? "desktop",
        theme: ctx.theme ?? undefined,
        siteTextEffect: ctx.siteTextEffect,
        pageAnimationsEnabled: ctx.pageAnimationsEnabled,
        previewMode: ctx.previewMode,
      }}
      firstBlockOverlayActive={isFirstBlock && firstBlockOverlayActive}
      blockIndex={blockIndex}
      lazyLoad={ctx.lazyLoad}
    >
      {inner}
    </BlockWrapper>
  );
}

export async function BlockRenderer({
  blocks,
  locale,
  lazyLoad = true,
  previewMode = false,
  parentType,
  parentId,
  translationBundle,
  pageHeaderOverlay = null,
  theme = null,
  siteTextEffect = null,
  pageAnimationsEnabled,
  discoveryAnchor = null,
  previewDevice,
}: Props) {
  const { blocks: migrated } = migrateBlocksToBlockSystem(blocks ?? []);
  if (!migrated.length) return null;

  let enabledLocales: PublicLocale[];
  let tGallery: Awaited<ReturnType<typeof getTranslations>>;
  let tPackages: Awaited<ReturnType<typeof getTranslations>>;
  let tTestimonials: Awaited<ReturnType<typeof getTranslations>>;
  let translationsByBlockId: BlockTranslationMap = new Map();

  try {
    [enabledLocales, tGallery, tPackages, tTestimonials] = await Promise.all([
      translationBundle?.enabledLocales ?? localeService.listEnabled(),
      getTranslations({ locale, namespace: "gallery" }),
      getTranslations({ locale, namespace: "packages" }),
      getTranslations({ locale, namespace: "testimonials" }),
    ]);

    if (parentType && parentId) {
      let resolvedRows: EntityTranslation[] = [];
      if (translationBundle) {
        resolvedRows = getBlockTranslationsFromBundle(
          translationBundle,
          migrated,
          parentType,
          parentId,
        );
      } else {
        const entityIds = collectBlockEntityIds(migrated, parentType, parentId);
        resolvedRows =
          entityIds.length > 0
            ? await translationService.getForBlockEntityIds(entityIds)
            : [];
      }
      translationsByBlockId = indexBlockTranslationsByBlockId(
        migrated,
        parentType,
        parentId,
        resolvedRows,
      );
    }
  } catch (error) {
    logServerRenderDiagnostic("BlockRenderer.setup", error);
    console.error("[BlockRenderer] setup-phase failure:", error);
    return null;
  }

  const ctx: RenderContext = {
    locale,
    enabledLocales,
    translationsByBlockId,
    lazyLoad,
    previewMode,
    theme,
    siteTextEffect,
    pageAnimationsEnabled,
    discoveryAnchor,
    tGallery,
    tPackages,
    tTestimonials,
    previewDevice,
  };

  const overlayActive = Boolean(pageHeaderOverlay?.enabled);

  const renderedBlocks = await Promise.all(
    migrated.map((block, index) =>
      RenderBlock({
        block,
        ctx,
        isFirstBlock: index === 0,
        firstBlockOverlayActive: overlayActive,
        blockIndex: index,
      }),
    ),
  );

  return (
    <div className="space-y-0">
      {renderedBlocks.map((node, index) =>
        previewMode ? (
          <div key={migrated[index]!.id} data-block-index={index} className="contents">
            {node}
          </div>
        ) : (
          <div key={migrated[index]!.id} className="contents">
            {node}
          </div>
        ),
      )}
    </div>
  );
}
