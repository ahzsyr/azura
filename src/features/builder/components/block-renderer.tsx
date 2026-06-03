import type { ReactNode } from "react";
import Image from "next/image";
import { getTranslations } from "next-intl/server";
import type { Locale } from "@/i18n/routing";
import type { BlockNode, PageBlocks } from "@/types/builder";
import type { ResolvedHeaderOverlay } from "@/features/navigation/types";
import { cn } from "@/lib/utils";
import {
  getPublishedPackages,
  getFaqSetBySlug,
  getGalleryBySlug,
  resolveTestimonialsForBlock,
} from "@/lib/data";
import { TestimonialsSection } from "@/components/marketing/testimonials-section";
import { PackageCard } from "@/components/packages/package-card";
import { CatalogBlockRenderer } from "@/features/catalog/components/catalog-block-renderer";
import { getBlockSettings } from "@/features/builder/instance/block-instance";
import { migrateBlocksToBlockSystem } from "@/features/builder/migration/upgrade-blocks";
import { BlockWrapper } from "@/features/builder/components/block-wrapper";
import { ContentListBlockRenderer } from "@/features/content/components/content-list-block-renderer";
import { mergeDisplaySettings } from "@/schemas/catalog/display-settings";
import { FAQAccordion } from "@/components/marketing/faq-accordion";
import { Section, SectionHeader } from "@/components/marketing/section";
import { GalleryBlockGrid } from "@/components/marketing/gallery-block-grid";
import { InquiryForm } from "@/components/forms/inquiry-form";
import { getLocalizedField } from "@/lib/utils";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { localeService } from "@/features/i18n/locale.service";
import { translationService } from "@/features/translation/translation.service";
import {
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
import { HeroAtmosphere } from "@/components/marketing/hero-atmosphere";
import { presetHeroGradientClass } from "@/lib/theme/preset-surface-classes";

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
  tGallery: Awaited<ReturnType<typeof getTranslations>>;
  tPackages: Awaited<ReturnType<typeof getTranslations>>;
  tTestimonials: Awaited<ReturnType<typeof getTranslations>>;
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

async function renderBlockContent(
  block: BlockNode,
  ctx: RenderContext,
  options?: { firstBlockOverlayActive?: boolean; siteTextEffect?: string | null }
): Promise<ReactNode> {
  const p = getBlockSettings(block);
  const { locale, lazyLoad, enabledLocales, previewMode } = ctx;
  const loc = (field: string) => blockLoc(p, field, block.id, ctx);
  const overlayClass = heroOverlayClass(Boolean(options?.firstBlockOverlayActive));
  const headingEffect = resolveBlockHeadingTextEffect(
    block.visual,
    options?.siteTextEffect ?? ctx.siteTextEffect ?? null,
  );

  switch (block.type) {
    case "hero": {
      const hasHeroImage = Boolean(p.imageUrl);
      const siteBgEffect =
        ctx.theme?.backgroundEffectEnabled !== false && ctx.theme?.backgroundEffect;
      const useTransparentHero = !hasHeroImage && Boolean(siteBgEffect);
      return (
        <section
          data-block-type="hero"
          className={cn(
            "relative min-h-[50vh] flex items-center justify-center overflow-hidden",
            useTransparentHero ? "hero-overlay--transparent" : "hero-overlay",
            useTransparentHero && presetHeroGradientClass(),
            hasHeroImage ? "text-white" : "text-foreground",
            overlayClass,
          )}
        >
          <HeroAtmosphere showGlow={!useTransparentHero || hasHeroImage} />
          {hasHeroImage && (
            <Image
              src={p.imageUrl as string}
              alt=""
              fill
              className="object-cover -z-10"
              priority={!lazyLoad}
              loading={lazyLoad ? "lazy" : undefined}
            />
          )}
          <div className="container-premium relative z-10 text-center py-20">
            <h1
              className="font-heading text-4xl md:text-5xl font-bold"
              data-hero-title
              data-text-effect-target="heading"
              {...(headingEffect ? { "data-text-effect": headingEffect } : {})}
            >
              {loc("title")}
            </h1>
            {loc("subtitle") && (
              <p className="mt-4 text-lg text-muted-foreground">{loc("subtitle")}</p>
            )}
            {typeof p.ctaHref === "string" && p.ctaHref && (
              <Button asChild className="mt-8" size="lg">
                <Link href={p.ctaHref}>{loc("ctaLabel") || "Learn more"}</Link>
              </Button>
            )}
          </div>
        </section>
      );
    }

    case "text":
      return (
        <Section>
          <div className="prose max-w-none mx-auto">
            <p className="text-lg text-muted-foreground whitespace-pre-wrap">{loc("content")}</p>
          </div>
        </Section>
      );

    case "gallery": {
      const slug = (p.gallerySlug as string) || "";
      if (!slug) {
        if (previewMode) {
          return (
            <Section>
              <p className="text-center text-sm text-muted-foreground">No gallery linked.</p>
            </Section>
          );
        }
        return null;
      }
      const album = await getGalleryBySlug(slug);
      if (!album) return null;
      const limit = Number(p.limit ?? 0);
      const media = limit > 0 ? album.media.slice(0, limit) : album.media;
      const cols = Number(p.columns ?? 3) as 2 | 3 | 4;
      const sectionTitle = loc("title") || getLocalizedField(album, "title", locale, { enabledLocales });

      return (
        <Section>
          {sectionTitle && <SectionHeader title={sectionTitle} />}
          <div className={sectionTitle ? "mt-8" : undefined}>
            <GalleryBlockGrid media={media} columns={cols} locale={locale} lazyLoad={lazyLoad} />
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

    case "pricing": {
      const packages = await getPublishedPackages((p.packageCategorySlug as string) || undefined);
      const limit = (p.limit as number) ?? 3;
      const featuredOnly = Boolean(p.showFeaturedOnly);
      const filtered = (featuredOnly ? packages.filter((x) => x.isFeatured) : packages).slice(0, limit);
      return (
        <Section>
          <SectionHeader title={loc("title") || ctx.tPackages("pricing")} />
          <div className="grid gap-6 mt-8 md:grid-cols-2 lg:grid-cols-3">
            {filtered.map((pkg) => (
              <PackageCard key={pkg.id} pkg={pkg} locale={locale} />
            ))}
          </div>
        </Section>
      );
    }

    case "image": {
      const url = (p.url as string) || "";
      if (!url) return null;
      return (
        <Section>
          <div className="relative aspect-video max-w-4xl mx-auto overflow-hidden rounded-xl">
            <Image
              src={url}
              alt={loc("alt") || ""}
              fill
              className="object-cover"
              loading={lazyLoad ? "lazy" : "eager"}
            />
          </div>
        </Section>
      );
    }

    case "catalog": {
      const settings = mergeDisplaySettings(p.displaySettings as Record<string, unknown>);
      return (
        <Section>
          <CatalogBlockRenderer
            locale={locale}
            title={loc("title") || undefined}
            subtitle={loc("subtitle") || undefined}
            config={{
              source: (p.source as "packages" | "hotels" | "services") ?? "packages",
              categorySlug: (p.categorySlug as string) || undefined,
              city: (p.city as string) || undefined,
              serviceType: (p.serviceType as string) || undefined,
              featuredOnly: Boolean(p.featuredOnly),
              manualIds: (p.manualIds as string[]) ?? [],
              limit: settings.limit,
            }}
            displaySettings={settings}
            viewAllHref={(p.viewAllHref as string) || undefined}
            emptyMessage={loc("emptyMessage") || undefined}
            previewMode={previewMode}
          />
        </Section>
      );
    }

    case "contentList":
      return (
        <Section>
          <ContentListBlockRenderer locale={locale} props={p} previewMode={previewMode} />
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
          {Boolean(p.titleEn || p.titleAr) && <SectionHeader title={loc("title")} />}
          <FAQAccordion faqs={faqs} locale={locale} />
        </Section>
      );
    }

    case "cta":
      return (
        <Section className="bg-primary/5">
          <div className="text-center max-w-2xl mx-auto">
            <h2 className="font-heading text-3xl font-bold">{loc("title")}</h2>
            <Button asChild className="mt-6" size="lg">
              <Link href={(p.href as string) || "/contact"}>{loc("button")}</Link>
            </Button>
          </div>
        </Section>
      );

    case "inquiryForm":
      return (
        <Section>
          {loc("title") ? <SectionHeader title={loc("title")} align="start" /> : null}
          <div className="mx-auto max-w-lg">
            <InquiryForm
              locale={locale}
              type={((p.type as "CONTACT" | "VISA" | "GENERAL") ?? "CONTACT")}
            />
          </div>
        </Section>
      );

    case "richText":
    case "customHtml":
      return (
        <Section>
          <div className="prose max-w-none mx-auto" dangerouslySetInnerHTML={{ __html: loc("html") || "" }} />
        </Section>
      );

    case "video":
      return p.url ? (
        <Section>
          {Boolean(p.titleEn || p.titleAr) && <SectionHeader title={loc("title")} />}
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
  const inner = await renderBlockContent(block, ctx, {
    firstBlockOverlayActive: isFirstBlock && firstBlockOverlayActive,
    siteTextEffect: ctx.siteTextEffect,
  });
  if (inner == null) return null;
  return (
    <BlockWrapper
      block={block}
      ctx={{
        locale: ctx.locale,
        device: "desktop",
        theme: ctx.theme ?? undefined,
        siteTextEffect: ctx.siteTextEffect,
        pageAnimationsEnabled: ctx.pageAnimationsEnabled,
      }}
      firstBlockOverlayActive={isFirstBlock && firstBlockOverlayActive}
      blockIndex={blockIndex}
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
}: Props) {
  const { blocks: migrated } = migrateBlocksToBlockSystem(blocks ?? []);
  if (!migrated.length) return null;

  const [enabledLocales, tGallery, tPackages, tTestimonials] = await Promise.all([
    translationBundle?.enabledLocales ?? localeService.listEnabled(),
    getTranslations({ locale, namespace: "gallery" }),
    getTranslations({ locale, namespace: "packages" }),
    getTranslations({ locale, namespace: "testimonials" }),
  ]);

  let translationsByBlockId: BlockTranslationMap = new Map();
  if (parentType && parentId) {
    let resolvedRows: EntityTranslation[] = [];
    if (translationBundle) {
      resolvedRows = getBlockTranslationsFromBundle(translationBundle, migrated, parentType, parentId);
    } else {
      const entityIds = collectBlockEntityIds(migrated, parentType, parentId);
      resolvedRows = entityIds.length > 0 ? await translationService.getForBlockEntityIds(entityIds) : [];
    }
    translationsByBlockId = indexBlockTranslationsByBlockId(migrated, parentType, parentId, resolvedRows);
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
    tGallery,
    tPackages,
    tTestimonials,
  };

  const overlayActive = Boolean(pageHeaderOverlay?.enabled);

  return (
    <div className="space-y-0">
      {migrated.map((block, index) =>
        previewMode ? (
          <div key={block.id} data-block-index={index} className="contents">
            <RenderBlock
              block={block}
              ctx={ctx}
              isFirstBlock={index === 0}
              firstBlockOverlayActive={overlayActive}
              blockIndex={index}
            />
          </div>
        ) : (
          <RenderBlock
            key={block.id}
            block={block}
            ctx={ctx}
            isFirstBlock={index === 0}
            firstBlockOverlayActive={overlayActive}
            blockIndex={index}
          />
        )
      )}
    </div>
  );
}
