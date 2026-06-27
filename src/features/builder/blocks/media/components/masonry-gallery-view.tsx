"use client";

import { useMemo, useState } from "react";
import { SectionHeader } from "@/components/marketing/section";
import { GalleryBlockGrid } from "@/components/marketing/gallery-block-grid";
import { MediaLightbox, type LightboxItem } from "@/features/builder/blocks/media/components/media-lightbox";
import type { GalleryMediaPublic } from "@/features/gallery/types";
import type { MasonryGalleryItem } from "@/features/builder/blocks/media/schemas/media-blocks";
import { getLocalizedField } from "@/lib/utils";
import { cn } from "@/lib/utils";
import type { BlockNode } from "@/types/builder";
import type { BlockOverflowContext } from "@/features/builder/components/marketing-items-overflow";
import { GalleryItemsOverflow } from "@/features/builder/components/gallery-items-overflow";

type Props = {
  title?: string;
  subtitle?: string;
  albumMedia?: GalleryMediaPublic[];
  inlineItems?: MasonryGalleryItem[];
  columns?: 2 | 3 | 4;
  enableLightbox?: boolean;
  enableFilter?: boolean;
  lazyLoad?: boolean;
  locale: string;
  block?: BlockNode;
  overflow?: BlockOverflowContext;
};

function inlineToPublic(items: MasonryGalleryItem[]): GalleryMediaPublic[] {
  return items.map((item) => ({
    id: item.id,
    titleEn: item.alt || item.caption,
    titleAr: item.alt || item.caption,
    excerptEn: null,
    excerptAr: null,
    descriptionEn: item.caption,
    descriptionAr: item.caption,
    infoEn: item.category,
    infoAr: item.category,
    mediaUrl: item.mediaKind === "VIDEO" ? item.videoUrl : item.imageUrl,
    mediaKind: item.mediaKind,
    sortOrder: 0,
  }));
}

export function MasonryGalleryView({
  title,
  subtitle,
  albumMedia = [],
  inlineItems = [],
  columns = 3,
  enableLightbox = true,
  enableFilter = false,
  lazyLoad = true,
  locale,
  block,
  overflow,
}: Props) {
  const [category, setCategory] = useState("all");
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const allMedia = albumMedia.length > 0 ? albumMedia : inlineToPublic(inlineItems);

  const categories = useMemo(() => {
    const set = new Set<string>();
    for (const m of allMedia) {
      const c = getLocalizedField(m, "info", locale) || getLocalizedField(m, "title", locale);
      if (c) set.add(c);
    }
    return Array.from(set).sort();
  }, [allMedia, locale]);

  const filtered = useMemo(() => {
    if (!enableFilter || category === "all") return allMedia;
    return allMedia.filter((m) => {
      const c = getLocalizedField(m, "info", locale);
      return c === category;
    });
  }, [allMedia, category, enableFilter, locale]);

  const lightboxItems: LightboxItem[] = filtered.map((m) => ({
    id: m.id,
    src: m.mediaUrl,
    alt: getLocalizedField(m, "title", locale),
    caption: getLocalizedField(m, "description", locale) || getLocalizedField(m, "title", locale),
    kind: m.mediaKind,
  }));

  return (
    <div>
      {title && <SectionHeader title={title} subtitle={subtitle} />}
      {enableFilter && categories.length > 0 && (
        <div className={cn("flex flex-wrap gap-2", title ? "mt-6" : undefined)}>
          <button
            type="button"
            onClick={() => setCategory("all")}
            className={cn(
              "rounded-full border px-3 py-1 text-xs",
              category === "all" ? "border-primary bg-primary text-primary-foreground" : "border-border"
            )}
          >
            All
          </button>
          {categories.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setCategory(c)}
              className={cn(
                "rounded-full border px-3 py-1 text-xs",
                category === c ? "border-primary bg-primary text-primary-foreground" : "border-border"
              )}
            >
              {c}
            </button>
          ))}
        </div>
      )}
      <div className={title || (enableFilter && categories.length > 0) ? "mt-8" : undefined}>
        {block && overflow ? (
          <GalleryItemsOverflow
            media={filtered}
            columns={columns}
            locale={locale}
            lazyLoad={lazyLoad}
            variant="masonry"
            block={block}
            overflow={overflow}
          />
        ) : (
          <GalleryBlockGrid
            media={filtered}
            columns={columns}
            locale={locale}
            lazyLoad={lazyLoad}
            variant="masonry"
            onItemClick={
              enableLightbox
                ? (item) => {
                    const idx = filtered.findIndex((m) => m.id === item.id);
                    if (idx >= 0) setLightboxIndex(idx);
                  }
                : undefined
            }
          />
        )}
      </div>
      {filtered.length === 0 && (
        <p className="text-center text-sm text-muted-foreground py-8">No media items.</p>
      )}
      <MediaLightbox items={lightboxItems} openIndex={lightboxIndex} onClose={() => setLightboxIndex(null)} />
    </div>
  );
}
