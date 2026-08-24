"use client";

import type { BlockNode, PageBlocks } from "@/types/builder";
import { BlockPreviewThumb } from "@/features/builder/components/block-preview-thumb";
import { migrateLegacyCatalogBlocks } from "@/features/builder/migrate-legacy-blocks";
import type { GalleryBuilderOption } from "@/features/gallery/types";
import type { FaqSetBuilderOption } from "@/features/faq/types";
import type {
  TestimonialBuilderOption,
  TestimonialCollectionBuilderOption,
} from "@/features/testimonials/types";
import { resolveBuilderOptionTitle } from "@/features/builder/lib/builder-option-label";
import { cn } from "@/lib/utils";
import { FALLBACK_LOCALES, resolvePrefixToCode } from "@/i18n/locale-config";
import type { PublicLocale } from "@/i18n/locale-config";
import { useBlockTranslationsOptional } from "@/features/builder/block-translation-context";
import { getBlockFieldValue } from "@/features/translation/block-translation";
import { SectionLayoutView } from "@/features/builder/components/section-layout-view";
import { parseSectionProps } from "@/schemas/builder/props";
import { isBlockHidden } from "@/features/builder/lib/block-hidden";
import {
  hasActiveBlockVisualBackground,
  resolveMarketingBackgroundType,
} from "@/features/builder/components/block-style-utils";
import { sectionBackgroundToCss } from "@/features/theme/backgrounds/background-system";
import { Badge } from "@/components/ui/badge";
import type { DeviceBreakpoint } from "@/types/block-system";
import { resolveContentOverflowForDevice } from "@/features/builder/styles/content-overflow-resolver";
import { blockRegistry } from "@/features/builder/registry/block-registry-system";
import { getBlockSettings } from "@/features/builder/instance/block-instance";
import {
  clampOverlayOpacity,
  shouldShowBackgroundScrim,
} from "@/features/builder/blocks/marketing/lib/background-scrim";
import { AdvancedRichTextView } from "@/features/builder/blocks/content/components/advanced-rich-text-view";
import { getCustomHtmlElements } from "@/features/builder/blocks/content/custom-html/get-elements";
import { serializeElementsToHtml } from "@/features/builder/blocks/content/custom-html/serialize";
import { sanitizeCustomHtml } from "@/features/builder/blocks/content/custom-html/sanitize";
import "@/features/builder/blocks/marketing/components/cta-banner.css";

function overflowPreviewLabel(block: BlockNode, device: DeviceBreakpoint): string | null {
  if (!blockRegistry.get(block.type)?.contentOverflowCapable) return null;
  const o = resolveContentOverflowForDevice(block, device);
  const mode =
    o.effectiveMode === "slider"
      ? o.sliderEnabled
        ? "slider"
        : "slider (grid fallback)"
      : o.effectiveMode === "collapse"
        ? `collapse (${o.collapseVariant})`
        : "grid";
  return mode;
}

function PreviewBlock({
  block,
  locale,
  locales,
  galleryOptions = [],
  faqSetOptions = [],
  testimonialOptions = [],
  testimonialCollectionOptions = [],
  previewDevice = "desktop",
}: {
  block: BlockNode;
  locale: string;
  locales: PublicLocale[];
  galleryOptions?: GalleryBuilderOption[];
  faqSetOptions?: FaqSetBuilderOption[];
  testimonialOptions?: TestimonialBuilderOption[];
  testimonialCollectionOptions?: TestimonialCollectionBuilderOption[];
  previewDevice?: DeviceBreakpoint;
}) {
  const p = getBlockSettings(block);
  const ctx = useBlockTranslationsOptional();
  const code = resolvePrefixToCode(locale, locales);
  const rows = ctx?.translationMap.get(block.id);
  const loc = (field: string) => getBlockFieldValue(rows, field, code, p, locales);
  const resolved = locales.find((l) => l.urlPrefix === locale || l.code === locale);
  const dir = resolved?.dir === "rtl" ? "rtl" : "ltr";

  switch (block.type) {
    case "hero": {
      const settings = getBlockSettings(block);
      const useBlockVisualBg = hasActiveBlockVisualBackground(block);
      const bgType = resolveMarketingBackgroundType(
        block,
        settings.backgroundType as string | undefined,
        "image"
      );
      const hasHeroImage = Boolean(settings.imageUrl);
      const overlayOpacity = clampOverlayOpacity((settings.overlayOpacity as number) ?? 60);
      const showPreviewScrim =
        !useBlockVisualBg &&
        shouldShowBackgroundScrim(bgType, {
          imageUrl: settings.imageUrl as string | undefined,
          videoUrl: settings.videoUrl as string | undefined,
          overlayOpacity,
        });
      const isDark =
        !useBlockVisualBg &&
        bgType !== "transparent" &&
        bgType !== "none" &&
        (bgType === "gradient" || bgType === "image" || bgType === "video" || hasHeroImage);
      return (
        <section
          dir={dir}
          className={cn(
            "relative min-h-[140px] flex items-center justify-center overflow-hidden p-6 text-center",
            !useBlockVisualBg && !hasHeroImage && bgType === "gradient" && "bg-primary/20",
            !useBlockVisualBg && !isDark && "bg-muted",
            isDark && "text-white"
          )}
          style={useBlockVisualBg ? sectionBackgroundToCss(block.visual?.sectionBackground) : undefined}
        >
          {!useBlockVisualBg && hasHeroImage && bgType === "image" && (
            <BlockPreviewThumb
              src={settings.imageUrl as string}
              fill
              className="object-cover"
            />
          )}
          {showPreviewScrim && (
            <div
              className="absolute inset-0 bg-black"
              style={{ opacity: overlayOpacity / 100 }}
              aria-hidden
            />
          )}
          <div className="relative z-10">
            <h2 className="font-bold text-lg">{loc("title") || "Hero"}</h2>
            {loc("subtitle") && <p className="text-sm mt-1 opacity-90">{loc("subtitle")}</p>}
          </div>
        </section>
      );
    }
    case "text": {
      const title = loc("title");
      const subtitle = loc("subtitle");
      const badge = loc("badge");
      const content = loc("content");
      if (!title && !subtitle && !badge && !content) {
        return (
          <div dir={dir} className="p-4 text-sm text-muted-foreground">
            Text block
          </div>
        );
      }
      return (
        <div dir={dir} className="p-4 space-y-1">
          {badge ? <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{badge}</p> : null}
          {title ? <p className="text-sm font-medium">{title}</p> : null}
          {subtitle ? <p className="text-xs text-muted-foreground">{subtitle}</p> : null}
          {content ? (
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{content}</p>
          ) : null}
        </div>
      );
    }
    case "image":
      return (p.url as string) ? (
        <div className="relative aspect-video m-2 rounded overflow-hidden bg-muted">
          <BlockPreviewThumb src={p.url as string} fill className="object-cover" />
        </div>
      ) : (
        <div className="m-2 h-24 bg-muted rounded flex items-center justify-center text-xs">Image</div>
      );
    case "gallery": {
      const slug = (p.gallerySlug as string) || "";
      const linked = galleryOptions.find((g) => g.slug === slug);
      const displayCount = linked
        ? (Number(p.limit) > 0 ? Math.min(Number(p.limit), linked.mediaCount) : linked.mediaCount)
        : 0;
      const cols = (p.columns as number) === 2 ? 2 : (p.columns as number) === 4 ? 4 : 3;
      const gridClass = cols === 2 ? "grid-cols-2" : cols === 4 ? "grid-cols-4" : "grid-cols-3";

      return (
        <div dir={dir} className="p-4">
          <p className="text-sm font-medium mb-1">
            {loc("title") || resolveBuilderOptionTitle(linked, code, "Gallery")}
          </p>
          {slug && linked ? (
            <p className="text-xs text-muted-foreground mb-2">
              {resolveBuilderOptionTitle(linked, code)} · /gallery/{slug} · {displayCount} item
              {displayCount === 1 ? "" : "s"}
              {!linked.isPublished ? " · Hidden" : ""}
            </p>
          ) : (
            <p className="text-xs text-muted-foreground mb-2">No gallery linked</p>
          )}
          <div className={`grid gap-1 ${gridClass}`}>
            {Array.from({ length: Math.min(displayCount || 3, 6) }).map((_, i) => (
              <div key={i} className="aspect-square rounded bg-muted" />
            ))}
          </div>
        </div>
      );
    }
    case "faq": {
      const slug = ((p.faqSetSlug as string) || (p.category as string) || "").trim();
      const linked = faqSetOptions.find((s) => s.slug === slug);
      return (
        <div dir={dir} className="p-4 text-sm">
          <p className="font-medium">{loc("title") || "FAQ"}</p>
          {slug ? (
            <p className="text-muted-foreground text-xs mt-1">
              {linked
                ? `${resolveBuilderOptionTitle(linked, code)} (${linked.slug}) — ${linked.itemCount} items`
                : `Set: ${slug}`}
              {linked && !linked.isPublished ? " [Hidden]" : ""}
            </p>
          ) : (
            <p className="text-muted-foreground text-xs mt-1">No FAQ set linked</p>
          )}
          <div className="mt-2 space-y-1">
            {Array.from({ length: Math.min(linked?.itemCount ?? 2, 4) }).map((_, i) => (
              <div key={i} className="h-8 rounded bg-muted" />
            ))}
          </div>
        </div>
      );
    }
    case "faqSetGrid": {
      const cols = Number(p.columns ?? 3);
      const gridClass =
        cols === 2 ? "grid-cols-2" : cols === 4 ? "grid-cols-4" : "grid-cols-3";
      const publishedCount = faqSetOptions.filter((s) => s.isPublished).length;
      return (
        <div dir={dir} className="p-4 text-sm">
          <p className="font-medium">{loc("title") || "FAQ sets"}</p>
          <p className="text-muted-foreground text-xs mt-1">
            {publishedCount} published set{publishedCount === 1 ? "" : "s"}
          </p>
          <div className={`mt-2 grid gap-1 ${gridClass}`}>
            {Array.from({ length: Math.min(Math.max(publishedCount, 3), 6) }).map((_, i) => (
              <div key={i} className="aspect-video rounded bg-muted" />
            ))}
          </div>
        </div>
      );
    }
    case "testimonials": {
      const source = (p.source as string) ?? "all";
      const slug = (p.testimonialCollectionSlug as string) ?? "";
      const ids = (p.testimonialIds as string[]) ?? [];
      const linked =
        source === "collection"
          ? testimonialCollectionOptions.find((c) => c.slug === slug)
          : null;
      const count =
        source === "manual"
          ? ids.length
          : source === "collection"
            ? linked?.itemCount ?? 0
            : testimonialOptions.filter((t) => t.isPublished).length;
      const previewCount = Math.min(Number(p.limit) || 3, count || 2, 3);
      const layout = (p.layoutMode as string) ?? "grid";
      const slider = layout === "slider" && Boolean(p.sliderEnabled);
      return (
        <div dir={dir} className="p-4">
          <p className="font-medium text-sm mb-1">{loc("title") || "Testimonials"}</p>
          <p className="text-muted-foreground text-xs mb-2">
            {source === "all" && "All published"}
            {source === "collection" &&
              (linked
                ? `Collection: ${resolveBuilderOptionTitle(linked, code)}`
                : slug
                  ? `Collection: ${slug}`
                  : "No collection linked")}
            {source === "manual" && `${ids.length} selected`}
            {linked && !linked.isPublished ? " [Hidden]" : ""}
            {" · "}
            {layout === "slider" ? (slider ? "Slider" : "Slider (grid fallback)") : "Grid"}
            {" · "}
            {(p.cardVariant as string) ?? "default"} cards
            {overflowPreviewLabel(block, previewDevice)
              ? ` · ${previewDevice} overflow: ${overflowPreviewLabel(block, previewDevice)}`
              : ""}
          </p>
          <div className={slider ? "flex gap-2 overflow-hidden" : "grid grid-cols-2 gap-2"}>
            {Array.from({ length: Math.max(previewCount, 1) }).map((_, i) => (
              <div
                key={i}
                className={cn(
                  "h-16 bg-muted rounded text-xs flex items-center justify-center shrink-0",
                  slider && "min-w-[45%]"
                )}
              >
                Testimonial
              </div>
            ))}
          </div>
        </div>
      );
    }
    case "pricing":
      return (
        <div dir={dir} className="p-4">
          <p className="font-medium text-sm mb-2">{loc("title") || "Pricing Table"}</p>
          <p className="text-xs text-muted-foreground mb-2">
            Source: {(p.source as string) || "packages"}
            {(p.planSetSlug as string) ? ` · ${p.planSetSlug as string}` : ""}
          </p>
          <div className="grid grid-cols-2 gap-2">
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="border rounded p-2 text-xs">
                Plan {i + 1}
              </div>
            ))}
          </div>
        </div>
      );
    case "cta": {
      const useBlockVisualBg = hasActiveBlockVisualBackground(block);
      const bgType = resolveMarketingBackgroundType(
        block,
        p.backgroundType as string | undefined
      );
      const isTransparentBg = bgType === "transparent" || bgType === "none";
      const isFilled =
        !isTransparentBg &&
        (bgType === "gradient" || bgType === "image" || bgType === "video" || Boolean(p.backgroundColor));
      const badge = loc("promoBadge");
      return (
        <div
          dir={dir}
          className={cn(
            "az-cta-banner az-cta-banner--preview px-5 py-6 text-center",
            bgType === "gradient" && "az-cta-banner--brand",
            isFilled && "az-cta-banner--filled",
            !isFilled && !isTransparentBg && "az-cta-banner--light",
          )}
          style={useBlockVisualBg ? sectionBackgroundToCss(block.visual?.sectionBackground) : undefined}
        >
          {badge ? <span className="az-cta-banner__badge">{badge}</span> : null}
          <p className="az-cta-banner__title font-heading whitespace-pre-line text-sm leading-tight">
            {loc("title")}
          </p>
          {loc("subtitle") ? (
            <p className="az-cta-banner__body mx-auto mt-2 line-clamp-2 text-[11px] leading-snug">
              {loc("subtitle")}
            </p>
          ) : null}
          <span className="az-cta-banner__btn mt-3 inline-flex items-center justify-center text-[11px]">
            {loc("button") || "CTA"}
          </span>
        </div>
      );
    }
    case "video":
      return (
        <div dir={dir} className="p-4">
          <div className="aspect-video bg-muted rounded flex items-center justify-center text-xs">
            {p.url ? "Video" : "No URL"}
          </div>
        </div>
      );
    case "richText":
      return (
        <div dir={dir} className="p-4 text-xs">
          <AdvancedRichTextView
            html={loc("html") || "<p>HTML content</p>"}
            maxWidth="full"
            prose
          />
        </div>
      );
    case "customHtml": {
      const elements = getCustomHtmlElements(p, code);
      const visibleCount = elements.filter((el) => !el.hidden).length;
      if (elements.length === 0) {
        return (
          <div dir={dir} className="p-4 text-xs text-muted-foreground">
            No HTML elements
          </div>
        );
      }
      const previewEl = elements.find((el) => !el.hidden);
      const previewHtml = previewEl
        ? sanitizeCustomHtml(serializeElementsToHtml([previewEl], code))
        : "";
      return (
        <div dir={dir} className="p-4 text-xs">
          <AdvancedRichTextView html={previewHtml || "<p>HTML content</p>"} maxWidth="full" prose />
          {elements.length > 1 && (
            <p className="mt-1 text-[10px] text-muted-foreground">
              +{elements.length - 1} more element{elements.length > 2 ? "s" : ""}
              {visibleCount < elements.length ? ` (${elements.length - visibleCount} hidden)` : ""}
            </p>
          )}
        </div>
      );
    }
    case "advancedRichText": {
      const maxWidth = (p.maxWidth as "full" | "contained" | "narrow" | "reading") ?? "reading";
      const prose = p.prose !== false;
      const sections = Array.isArray(p.sections) && p.sections.length > 0
        ? (p.sections as Record<string, unknown>[])
        : null;
      const firstHtml = sections
        ? (sections[0]?.[`html${loc("_suffix") || "En"}`] as string | undefined) ||
          (sections[0]?.htmlEn as string | undefined) ||
          (sections[0]?.html as string | undefined) ||
          ""
        : loc("html") || (p.htmlEn as string) || "";
      return (
        <div dir={dir} className="p-2 border border-dashed rounded m-2 text-xs">
          <AdvancedRichTextView
            html={firstHtml || "<p>Advanced rich text</p>"}
            maxWidth={maxWidth}
            prose={prose}
          />
          {sections && sections.length > 1 && (
            <p className="text-[10px] text-muted-foreground mt-1 text-center">
              + {sections.length - 1} more section{sections.length - 1 !== 1 ? "s" : ""}
            </p>
          )}
        </div>
      );
    }
    case "markdown":
      return (
        <div dir={dir} className="p-4 text-xs font-mono whitespace-pre-wrap border border-dashed rounded m-2 max-h-32 overflow-auto">
          {loc("markdown") || (p.markdownEn as string) || "Markdown block"}
        </div>
      );
    case "code":
      return (
        <div dir={dir} className="p-4 m-2 rounded border bg-muted/40 font-mono text-xs max-h-32 overflow-auto">
          {(p.code as string)?.slice(0, 200) || "Code block"}
        </div>
      );
    case "table":
      return (
        <div dir={dir} className="p-4 text-sm text-muted-foreground text-center border border-dashed rounded m-2">
          Table · {((p.columns as unknown[]) ?? []).length} cols · {((p.rows as unknown[]) ?? []).length} rows
        </div>
      );
    case "timeline":
      return (
        <div dir={dir} className="p-4 text-sm text-muted-foreground text-center border border-dashed rounded m-2">
          Timeline · {((p.items as unknown[]) ?? []).length} events
        </div>
      );
    case "changelog":
      return (
        <div dir={dir} className="p-4 text-sm text-muted-foreground text-center border border-dashed rounded m-2">
          Release Notes · {(p.releaseSetSlug as string) || `${((p.releases as unknown[]) ?? []).length} inline releases`}
        </div>
      );
    case "comparison":
      return (
        <div dir={dir} className="p-4 text-sm text-muted-foreground text-center border border-dashed rounded m-2">
          Comparison · {(p.source as string) ?? "manual"}
        </div>
      );
    case "featureGrid":
      return (
        <div dir={dir} className="p-4 text-sm text-muted-foreground text-center border border-dashed rounded m-2">
          Feature Grid · {((p.items as unknown[]) ?? []).length} items
        </div>
      );
    case "benefitsGrid":
      return (
        <div dir={dir} className="p-4 text-sm text-muted-foreground text-center border border-dashed rounded m-2">
          Benefits Grid · {((p.items as unknown[]) ?? []).length} items
        </div>
      );
    case "announcementBar":
      return (
        <div dir={dir} className="p-4 text-sm text-muted-foreground text-center border border-dashed rounded m-2">
          Announcement Bar · {(p.barTone as string) ?? "accent"} · {((p.items as unknown[]) ?? []).length} items
        </div>
      );
    case "trustBadges":
      return (
        <div dir={dir} className="p-4 text-sm text-muted-foreground text-center border border-dashed rounded m-2">
          Trust Badges · {((p.items as unknown[]) ?? []).length} badges
        </div>
      );
    case "logoCloud":
      return (
        <div dir={dir} className="p-4 text-sm text-muted-foreground text-center border border-dashed rounded m-2">
          Logo Cloud · {(p.displayMode as string) ?? "grid"} · {((p.items as unknown[]) ?? []).length} logos
        </div>
      );
    case "statsCounter":
      return (
        <div dir={dir} className="p-4 text-sm text-muted-foreground text-center border border-dashed rounded m-2">
          Stats · {((p.items as unknown[]) ?? []).length} metrics
        </div>
      );
    case "beforeAfter":
      return (
        <div dir={dir} className="p-4 text-sm text-muted-foreground text-center border border-dashed rounded m-2">
          Image Comparison · {(p.layout as string) ?? "slider"}
        </div>
      );
    case "tabbedShowcase":
      return (
        <div dir={dir} className="p-4 text-sm text-muted-foreground text-center border border-dashed rounded m-2">
          Tabbed Showcase · {((p.tabs as unknown[]) ?? []).length} tabs
        </div>
      );
    case "videoHero":
      return (
        <div dir={dir} className="p-4 text-sm text-muted-foreground text-center border border-dashed rounded m-2">
          Video Hero · {(p.mediaMode as string) ?? "single"} · {(p.layout as string) ?? "fullBleed"}
        </div>
      );
    case "videoGallery":
      return (
        <div dir={dir} className="p-4 text-sm text-muted-foreground text-center border border-dashed rounded m-2">
          Video Gallery · {(p.source as string) ?? "inline"} · {((p.items as unknown[]) ?? []).length} items
        </div>
      );
    case "interactiveHotspots":
      return (
        <div dir={dir} className="p-4 text-sm text-muted-foreground text-center border border-dashed rounded m-2">
          Interactive Hotspots · {((p.hotspots as unknown[]) ?? []).length} points
        </div>
      );
    case "masonryGallery":
      return (
        <div dir={dir} className="p-4 text-sm text-muted-foreground text-center border border-dashed rounded m-2">
          Masonry Gallery · {(p.source as string) ?? "inline"}
        </div>
      );
    case "productGrid":
      return (
        <div dir={dir} className="p-4 text-sm text-muted-foreground text-center border border-dashed rounded m-2">
          Product Grid · {(p.source as string) ?? "collection"} · {(p.limit as number) ?? 8} items
        </div>
      );
    case "productCarousel":
      return (
        <div dir={dir} className="p-4 text-sm text-muted-foreground text-center border border-dashed rounded m-2">
          Product Carousel · {(p.limit as number) ?? 8} items
        </div>
      );
    case "productComparison":
      return (
        <div dir={dir} className="p-4 text-sm text-muted-foreground text-center border border-dashed rounded m-2">
          Product Comparison · {((p.productSlugs as string[]) ?? []).length} products
        </div>
      );
    case "productSpecifications":
      return (
        <div dir={dir} className="p-4 text-sm text-muted-foreground text-center border border-dashed rounded m-2">
          Product Specifications · {(p.productSlug as string) || "manual"}
        </div>
      );
    case "productReviews":
      return (
        <div dir={dir} className="p-4 text-sm text-muted-foreground text-center border border-dashed rounded m-2">
          Product Reviews · {(p.productSlug as string) || "—"}
        </div>
      );
    case "productFaq":
      return (
        <div dir={dir} className="p-4 text-sm text-muted-foreground text-center border border-dashed rounded m-2">
          Product FAQ · {(p.source as string) ?? "manual"}
        </div>
      );
    case "relatedProducts":
      return (
        <div dir={dir} className="p-4 text-sm text-muted-foreground text-center border border-dashed rounded m-2">
          Related Products · {(p.rule as string) ?? "collection"}
        </div>
      );
    case "searchBlock":
      return (
        <div dir={dir} className="p-4 text-sm text-muted-foreground text-center border border-dashed rounded m-2">
          Search Block · {(p.layout as string) ?? "inline"}
        </div>
      );
    case "advancedFilters":
      return (
        <div dir={dir} className="p-4 text-sm text-muted-foreground text-center border border-dashed rounded m-2">
          Advanced Filters · {(p.scope as string) ?? "products"}
        </div>
      );
    case "categoryExplorer":
      return (
        <div dir={dir} className="p-4 text-sm text-muted-foreground text-center border border-dashed rounded m-2">
          Category Explorer · {(p.source as string) ?? "collections"} · limit{" "}
          {(p.pageSize as number) ?? 12}
          {(p.enablePagination as boolean) !== false ? " · paginated" : " · truncated"}
        </div>
      );
    case "relatedContent":
      return (
        <div dir={dir} className="p-4 text-sm text-muted-foreground text-center border border-dashed rounded m-2">
          Related Content · {(p.rule as string) ?? "taxonomy"}
        </div>
      );
    case "recentlyViewed":
      return (
        <div dir={dir} className="p-4 text-sm text-muted-foreground text-center border border-dashed rounded m-2">
          Recently Viewed · limit {(p.limit as number) ?? 8}
        </div>
      );
    case "categoryShowcase":
      return (
        <div dir={dir} className="p-4 text-sm text-muted-foreground text-center border border-dashed rounded m-2">
          Category Showcase · {(p.layout as string) ?? "grid"}
        </div>
      );
    case "brandShowcase":
      return (
        <div dir={dir} className="p-4 text-sm text-muted-foreground text-center border border-dashed rounded m-2">
          Brand Showcase · {(p.layout as string) ?? "logoGrid"}
        </div>
      );
    case "productShowcase":
      return (
        <div dir={dir} className="p-4 text-sm text-muted-foreground text-center border border-dashed rounded m-2">
          Product Showcase · {(p.mode as string) ?? "single"} / {(p.layout as string) ?? "grid"}
        </div>
      );
    case "taxonomyProductTabs":
      return (
        <div dir={dir} className="p-4 text-sm text-muted-foreground text-center border border-dashed rounded m-2">
          Taxonomy Tabs · {(p.taxonomy as string) ?? "category"}
        </div>
      );
    case "megaCollectionShowcase":
      return (
        <div dir={dir} className="p-4 text-sm text-muted-foreground text-center border border-dashed rounded m-2">
          Mega Collection
        </div>
      );
    case "productDiscovery":
      return (
        <div dir={dir} className="p-4 text-sm text-muted-foreground text-center border border-dashed rounded m-2">
          Product Discovery · {(p.layout as string) ?? "grid"}
        </div>
      );
    case "stickyCta":
      return (
        <div dir={dir} className="p-4 text-sm text-muted-foreground text-center border border-dashed rounded m-2">
          Sticky CTA · {(p.variant as string) ?? "bar"} / {(p.trigger as string) ?? "scroll"}
        </div>
      );
    case "leadForm":
    case "contactFormBuilder":
    case "multiStepForm":
      return (
        <div dir={dir} className="p-4 text-sm text-muted-foreground text-center border border-dashed rounded m-2">
          {block.type} · template {(p.templateId as string) || "—"}
        </div>
      );
    case "newsletterSignup":
      return (
        <div dir={dir} className="p-4 text-sm text-muted-foreground text-center border border-dashed rounded m-2">
          Newsletter · segment {(p.segment as string) ?? "default"}
        </div>
      );
    case "downloadGate":
      return (
        <div dir={dir} className="p-4 text-sm text-muted-foreground text-center border border-dashed rounded m-2">
          Download Gate · {(p.unlockMethod as string) ?? "form"}
        </div>
      );
    case "pricingCalculator":
      return (
        <div dir={dir} className="p-4 text-sm text-muted-foreground text-center border border-dashed rounded m-2">
          Pricing Calculator · {(p.pricingCalculatorSlug as string) || "—"}
        </div>
      );
    case "knowledgeBase":
      return (
        <div dir={dir} className="p-4 text-sm text-muted-foreground text-center border border-dashed rounded m-2">
          Knowledge Base · {(p.knowledgeBaseSlug as string) || "—"}
        </div>
      );
    case "documentationNav":
      return (
        <div dir={dir} className="p-4 text-sm text-muted-foreground text-center border border-dashed rounded m-2">
          Documentation · {(p.docPortalSlug as string) || "—"}
        </div>
      );
    case "statusDashboard":
      return (
        <div dir={dir} className="p-4 text-sm text-muted-foreground text-center border border-dashed rounded m-2">
          Status Dashboard · {(p.statusBoardSlug as string) || "—"}
        </div>
      );
    case "teamDirectory":
      return (
        <div dir={dir} className="p-4 text-sm text-muted-foreground text-center border border-dashed rounded m-2">
          Team Directory · {(p.teamDirectorySlug as string) || "—"}
        </div>
      );
    case "partnerDirectory":
      return (
        <div dir={dir} className="p-4 text-sm text-muted-foreground text-center border border-dashed rounded m-2">
          Partner Directory · {(p.partnerProgramSlug as string) || "—"}
        </div>
      );
    case "catalog":
      return (
        <div dir={dir} className="p-4 text-sm text-muted-foreground text-center border border-dashed rounded m-2">
          {block.type} block · {(p.source as string) || block.type} ({(p.limit as number) ?? 4} items)
        </div>
      );
    case "spacer":
      return <div style={{ height: Math.min((p.height as number) ?? 48, 80) }} className="bg-muted/30" />;
    case "divider":
      return (
        <hr
          className={
            p.style === "gold" ? "border-accent border-t-2" : p.style === "dashed" ? "border-dashed" : ""
          }
        />
      );
    case "section": {
      const sectionProps = parseSectionProps(p);
      return (
        <div
          className={
            p.background === "muted"
              ? "bg-muted/50 p-2"
              : p.background === "primary"
                ? "bg-primary/5 p-2"
                : "border border-dashed p-2"
          }
        >
          <p className="text-[10px] text-muted-foreground uppercase tracking-wide px-1 mb-2">
            Section · {sectionProps.layoutMode}
          </p>
          <SectionLayoutView
            layoutMode={sectionProps.layoutMode}
            gap={sectionProps.gap}
            stackOnMobile={sectionProps.stackOnMobile}
            maxWidth={sectionProps.maxWidth}
            columns={sectionProps.columns}
            slidesPerView={sectionProps.slidesPerView}
            showArrows={sectionProps.showArrows}
            showDots={sectionProps.showDots}
            autoplay={false}
            autoplayIntervalMs={sectionProps.autoplayIntervalMs}
            loop={sectionProps.loop}
          >
            {block.children?.map((child) => (
              <PreviewBlock
                key={child.id}
                block={child}
                locale={locale}
                locales={locales}
                galleryOptions={galleryOptions}
                faqSetOptions={faqSetOptions}
                testimonialOptions={testimonialOptions}
                testimonialCollectionOptions={testimonialCollectionOptions}
              />
            ))}
          </SectionLayoutView>
          {!block.children?.length && (
            <p className="text-xs text-center text-muted-foreground py-4">Empty section</p>
          )}
        </div>
      );
    }
    case "rowSection": {
      const maxColumns = (p.maxColumns as number) ?? 2;
      const childCount = block.children?.length ?? 0;
      const visibleChildren = (block.children ?? []).slice(0, maxColumns);
      const extraCount = childCount - visibleChildren.length;
      const gap = (p.gap as string) ?? "md";
      const stackOnMobile = (p.stackOnMobile as boolean) ?? true;
      const verticalAlign = (p.verticalAlign as string) ?? "stretch";
      return (
        <div
          className={
            p.background === "muted"
              ? "bg-muted/50 p-2"
              : p.background === "primary"
                ? "bg-primary/5 p-2"
                : "border border-dashed p-2"
          }
        >
          <p className="text-[10px] text-muted-foreground uppercase tracking-wide px-1 mb-2">
            Row · {Math.min(childCount, maxColumns)}/{maxColumns} columns
          </p>
          {extraCount > 0 && (
            <p className="text-[10px] text-amber-600 mb-2 px-1">
              {extraCount} extra block{extraCount > 1 ? "s" : ""} hidden (exceeds max columns)
            </p>
          )}
          <div
            className={[
              "row-section-grid row-section-grid--preview",
              gap === "sm" ? "row-section-grid--gap-sm" : gap === "lg" ? "row-section-grid--gap-lg" : "row-section-grid--gap-md",
              verticalAlign === "start"
                ? "row-section-grid--align-start"
                : verticalAlign === "center"
                  ? "row-section-grid--align-center"
                  : "row-section-grid--align-stretch",
              stackOnMobile ? "row-section-grid--stack-mobile" : "",
            ]
              .filter(Boolean)
              .join(" ")}
            data-column-layout={(p.columnLayout as string) ?? "equal"}
            data-max-columns={maxColumns}
          >
            {visibleChildren.map((child, index) => (
              <div
                key={child.id}
                className="row-section-grid__cell min-w-0 border border-dashed border-muted-foreground/30 rounded p-1"
                data-split-cell={
                  (p.columnLayout === "wide-left" || p.columnLayout === "wide-right") && index < 2
                    ? index === 0
                      ? "start"
                      : "end"
                    : undefined
                }
              >
                <PreviewBlock
                  block={child}
                  locale={locale}
                  locales={locales}
                  galleryOptions={galleryOptions}
                  faqSetOptions={faqSetOptions}
                  testimonialOptions={testimonialOptions}
                  testimonialCollectionOptions={testimonialCollectionOptions}
                />
              </div>
            ))}
          </div>
          {!visibleChildren.length && (
            <p className="text-xs text-center text-muted-foreground py-4">Empty row — add blocks to columns</p>
          )}
        </div>
      );
    }
    case "contactSection": {
      const leftIds = (p.leftSlotIds as string[]) ?? [];
      const rightIds = (p.rightSlotIds as string[]) ?? [];
      const children = block.children ?? [];
      const left = leftIds
        .map((id) => children.find((c) => c.id === id))
        .filter((c): c is BlockNode => Boolean(c));
      const right = [
        ...rightIds
          .map((id) => children.find((c) => c.id === id))
          .filter((c): c is BlockNode => Boolean(c)),
        ...children.filter((c) => !leftIds.includes(c.id) && !rightIds.includes(c.id)),
      ];
      const previewChild = (child: BlockNode) => (
        <PreviewBlock
          key={child.id}
          block={child}
          locale={locale}
          locales={locales}
          galleryOptions={galleryOptions}
          faqSetOptions={faqSetOptions}
          testimonialOptions={testimonialOptions}
          testimonialCollectionOptions={testimonialCollectionOptions}
        />
      );
      return (
        <div className="border border-dashed p-2 space-y-2">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wide px-1">
            Contact Section · {(p.desktopLayout as string) ?? "60/40"}
          </p>
          {(p.title as string) ? (
            <p className="text-sm font-semibold px-1">{p.title as string}</p>
          ) : null}
          <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
            <div className="space-y-2 min-w-0">{left.map(previewChild)}</div>
            <div className="space-y-2 min-w-0">{right.map(previewChild)}</div>
          </div>
          {!children.length && (
            <p className="text-xs text-center text-muted-foreground py-4">
              Empty contact section — nest contact blocks
            </p>
          )}
        </div>
      );
    }
    case "contactMap":
    case "contactLocation":
    case "contactPhone":
    case "contactSocial":
      return (
        <div className="rounded-lg border bg-card p-3 space-y-1">
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{block.type}</p>
          <p className="text-sm font-medium">{(p.title as string) || "Untitled"}</p>
          {(p.description as string) ? (
            <p className="text-xs text-muted-foreground line-clamp-2">{p.description as string}</p>
          ) : null}
        </div>
      );
    default:
      return null;
  }
}

type Props = {
  blocks: PageBlocks;
  locale?: string;
  locales?: PublicLocale[];
  galleryOptions?: GalleryBuilderOption[];
  faqSetOptions?: FaqSetBuilderOption[];
  testimonialOptions?: TestimonialBuilderOption[];
  testimonialCollectionOptions?: TestimonialCollectionBuilderOption[];
  previewDevice?: DeviceBreakpoint;
};

export function BlockPreviewRenderer({
  blocks,
  locale = "en",
  locales = FALLBACK_LOCALES,
  galleryOptions = [],
  faqSetOptions = [],
  testimonialOptions = [],
  testimonialCollectionOptions = [],
  previewDevice = "desktop",
}: Props) {
  const normalized = migrateLegacyCatalogBlocks(blocks);
  if (!normalized.length) {
    return <p className="text-xs text-muted-foreground text-center py-8">Add blocks to preview</p>;
  }
  return (
    <div className="bg-background text-foreground text-start overflow-hidden">
      {normalized.map((block) => {
        const hidden = isBlockHidden(block);
        return (
          <div
            key={block.id}
            className={cn("relative", hidden && "opacity-50 ring-1 ring-dashed ring-muted-foreground/40")}
          >
            {hidden ? (
              <Badge
                variant="secondary"
                className="absolute top-2 end-2 z-20 text-[10px] pointer-events-none"
              >
                Hidden on site
              </Badge>
            ) : null}
            <PreviewBlock
              block={block}
              locale={locale}
              locales={locales}
              galleryOptions={galleryOptions}
              faqSetOptions={faqSetOptions}
              testimonialOptions={testimonialOptions}
              testimonialCollectionOptions={testimonialCollectionOptions}
              previewDevice={previewDevice}
            />
          </div>
        );
      })}
    </div>
  );
}
