"use client";

import Image from "next/image";
import type { BlockNode, PageBlocks } from "@/types/builder";
import { migrateLegacyCatalogBlocks } from "@/features/builder/migrate-legacy-blocks";
import type { GalleryBuilderOption } from "@/features/gallery/types";
import type { FaqSetBuilderOption } from "@/features/faq/types";
import type {
  TestimonialBuilderOption,
  TestimonialCollectionBuilderOption,
} from "@/features/testimonials/types";
import { cn } from "@/lib/utils";
import { FALLBACK_LOCALES, resolvePrefixToCode } from "@/i18n/locale-config";
import type { PublicLocale } from "@/i18n/locale-config";
import { useBlockTranslationsOptional } from "@/features/builder/block-translation-context";
import { getBlockFieldValue } from "@/features/translation/block-translation";

function PreviewBlock({
  block,
  locale,
  locales,
  galleryOptions = [],
  faqSetOptions = [],
  testimonialOptions = [],
  testimonialCollectionOptions = [],
}: {
  block: BlockNode;
  locale: string;
  locales: PublicLocale[];
  galleryOptions?: GalleryBuilderOption[];
  faqSetOptions?: FaqSetBuilderOption[];
  testimonialOptions?: TestimonialBuilderOption[];
  testimonialCollectionOptions?: TestimonialCollectionBuilderOption[];
}) {
  const p = block.props;
  const ctx = useBlockTranslationsOptional();
  const code = resolvePrefixToCode(locale, locales);
  const rows = ctx?.translationMap.get(block.id);
  const loc = (field: string) => getBlockFieldValue(rows, field, code, p, locales);
  const resolved = locales.find((l) => l.urlPrefix === locale || l.code === locale);
  const dir = resolved?.dir === "rtl" ? "rtl" : "ltr";

  switch (block.type) {
    case "hero":
      return (
        <section dir={dir} className="relative min-h-[140px] flex items-center justify-center bg-emerald-800 text-white p-6 text-center">
          {Boolean(p.imageUrl) && (
            <Image src={p.imageUrl as string} alt="" fill className="object-cover opacity-40" sizes="400px" />
          )}
          <div className="relative z-10">
            <h2 className="font-bold text-lg">{loc("title") || "Hero"}</h2>
            {loc("subtitle") && <p className="text-sm mt-1 opacity-90">{loc("subtitle")}</p>}
          </div>
        </section>
      );
    case "text":
      return (
        <div dir={dir} className="p-4 text-sm text-muted-foreground whitespace-pre-wrap">
          {loc("content") || "Text block"}
        </div>
      );
    case "image":
      return (p.url as string) ? (
        <div className="relative aspect-video m-2 rounded overflow-hidden bg-muted">
          <Image src={p.url as string} alt="" fill className="object-cover" sizes="300px" />
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
          <p className="text-sm font-medium mb-1">{loc("title") || linked?.titleEn || "Gallery"}</p>
          {slug && linked ? (
            <p className="text-xs text-muted-foreground mb-2">
              {linked.titleEn} · /gallery/{slug} · {displayCount} item{displayCount === 1 ? "" : "s"}
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
                ? `${linked.titleEn} (${linked.slug}) — ${linked.itemCount} items`
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
              (linked ? `Collection: ${linked.titleEn}` : slug ? `Collection: ${slug}` : "No collection linked")}
            {source === "manual" && `${ids.length} selected`}
            {linked && !linked.isPublished ? " [Hidden]" : ""}
            {" · "}
            {layout === "slider" ? (slider ? "Slider" : "Slider (grid fallback)") : "Grid"}
            {" · "}
            {(p.cardVariant as string) ?? "default"} cards
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
          <p className="font-medium text-sm mb-2">{loc("title") || "Pricing"}</p>
          <div className="grid grid-cols-2 gap-2">
            {Array.from({ length: Math.min((p.limit as number) || 2, 2) }).map((_, i) => (
              <div key={i} className="border rounded p-2 text-xs">
                Package {i + 1}
              </div>
            ))}
          </div>
        </div>
      );
    case "cta":
      return (
        <div dir={dir} className="p-6 bg-primary/10 text-center">
          <p className="font-semibold text-sm">{loc("title")}</p>
          <span className="inline-block mt-2 px-3 py-1 bg-primary text-white text-xs rounded">
            {loc("button") || "CTA"}
          </span>
        </div>
      );
    case "inquiryForm":
      return (
        <div dir={dir} className="p-4 border border-dashed rounded m-2 space-y-2">
          <p className="font-medium text-sm">{loc("title") || "Inquiry form"}</p>
          <p className="text-xs text-muted-foreground">Type: {(p.type as string) ?? "CONTACT"}</p>
          <div className="h-20 bg-muted/50 rounded flex items-center justify-center text-xs text-muted-foreground">
            Form fields
          </div>
        </div>
      );
    case "video":
      return (
        <div dir={dir} className="p-4">
          <div className="aspect-video bg-muted rounded flex items-center justify-center text-xs">
            {p.url ? "Video" : "No URL"}
          </div>
        </div>
      );
    case "richText":
    case "customHtml":
      return (
        <div
          dir={dir}
          className="p-4 prose prose-sm max-w-none text-xs"
          dangerouslySetInnerHTML={{ __html: loc("html") || "<p>HTML content</p>" }}
        />
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
    case "section":
      return (
        <div
          className={
            p.background === "muted"
              ? "bg-muted/50 p-2 space-y-2"
              : p.background === "primary"
                ? "bg-primary/5 p-2 space-y-2"
                : "border border-dashed p-2 space-y-2"
          }
        >
          <p className="text-[10px] text-muted-foreground uppercase tracking-wide px-1">Section</p>
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
          {!block.children?.length && (
            <p className="text-xs text-center text-muted-foreground py-4">Empty section</p>
          )}
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
};

export function BlockPreviewRenderer({
  blocks,
  locale = "en",
  locales = FALLBACK_LOCALES,
  galleryOptions = [],
  faqSetOptions = [],
  testimonialOptions = [],
  testimonialCollectionOptions = [],
}: Props) {
  const normalized = migrateLegacyCatalogBlocks(blocks);
  if (!normalized.length) {
    return <p className="text-xs text-muted-foreground text-center py-8">Add blocks to preview</p>;
  }
  return (
    <div className="bg-background text-foreground text-start overflow-hidden">
      {normalized.map((block) => (
        <PreviewBlock
          key={block.id}
          block={block}
          locale={locale}
          locales={locales}
          galleryOptions={galleryOptions}
          faqSetOptions={faqSetOptions}
          testimonialOptions={testimonialOptions}
          testimonialCollectionOptions={testimonialCollectionOptions}
        />
      ))}
    </div>
  );
}
