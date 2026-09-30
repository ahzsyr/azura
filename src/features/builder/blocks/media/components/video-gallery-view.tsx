"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { SectionHeader } from "@/components/marketing/section";
import { MediaLightbox, type LightboxItem } from "@/features/builder/blocks/media/components/media-lightbox";
import { EmbedVideoPlayer } from "@/features/builder/blocks/media/components/embed-video-player";
import { isEmbedUrl } from "@/features/builder/blocks/media/lib/embed-video";
import type { VideoGalleryItem } from "@/features/builder/blocks/media/schemas/media-blocks";
import { getLocalizedField } from "@/lib/utils";
import { cn } from "@/lib/utils";
import type { BlockNode } from "@/types/builder";
import type { BlockOverflowContext } from "@/features/builder/components/marketing-items-overflow";
import { VideoGalleryItemsOverflow } from "@/features/builder/blocks/media/components/video-gallery-items-overflow";

export type VideoGalleryResolvedItem = VideoGalleryItem & {
  playUrl: string;
};

type Props = {
  title?: string;
  subtitle?: string;
  items: VideoGalleryResolvedItem[];
  columns?: 2 | 3 | 4;
  layout?: "grid" | "list";
  enableLightbox?: boolean;
  autoplayInGrid?: boolean;
  showCategories?: boolean;
  showControls?: boolean;
  loop?: boolean;
  preload?: "none" | "metadata" | "auto";
  locale: string;
  block?: BlockNode;
  overflow?: BlockOverflowContext;
};

export function VideoGalleryView({
  title,
  subtitle,
  items,
  columns = 3,
  layout = "grid",
  enableLightbox = true,
  autoplayInGrid = false,
  showCategories = false,
  showControls = true,
  loop = false,
  preload = "metadata",
  locale,
  block,
  overflow,
}: Props) {
  const [category, setCategory] = useState<string>("all");
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const categories = useMemo(() => {
    const set = new Set<string>();
    for (const item of items) {
      const c = getLocalizedField(item, "category", locale);
      if (c) set.add(c);
    }
    return Array.from(set).sort();
  }, [items, locale]);

  const filtered = useMemo(() => {
    if (!showCategories || category === "all") return items;
    return items.filter((item) => getLocalizedField(item, "category", locale) === category);
  }, [items, category, showCategories, locale]);

  const lightboxItems: LightboxItem[] = filtered.map((item) => ({
    id: item.id,
    src: item.playUrl,
    embedUrl: item.embedUrl || undefined,
    alt: getLocalizedField(item, "title", locale),
    caption: getLocalizedField(item, "title", locale),
    kind: "VIDEO",
  }));

  const colClass =
    columns === 2 ? "grid-cols-1 sm:grid-cols-2" : columns === 4 ? "grid-cols-2 md:grid-cols-4" : "grid-cols-1 sm:grid-cols-2 md:grid-cols-3";

  return (
    <div>
      {title && <SectionHeader title={title} subtitle={subtitle} />}
      {showCategories && categories.length > 0 && (
        <div className={cn("flex flex-wrap gap-2", title ? "mt-6" : undefined)}>
          <FilterChip active={category === "all"} onClick={() => setCategory("all")} label="All" />
          {categories.map((c) => (
            <FilterChip key={c} active={category === c} onClick={() => setCategory(c)} label={c} />
          ))}
        </div>
      )}
      {block && overflow ? (
        <div className={title || (showCategories && categories.length > 0) ? "mt-8" : undefined}>
          <VideoGalleryItemsOverflow
            items={filtered}
            columns={columns}
            layout={layout}
            locale={locale}
            enableLightbox={enableLightbox}
            autoplayInGrid={autoplayInGrid}
            showCategories={showCategories}
            showControls={showControls}
            loop={loop}
            preload={preload}
            onPlay={setLightboxIndex}
            block={block}
            overflow={overflow}
          />
        </div>
      ) : (
      <div
        className={cn(
          title || (showCategories && categories.length > 0) ? "mt-8" : undefined,
          layout === "list" ? "flex flex-col gap-4" : `grid gap-4 ${colClass}`
        )}
      >
        {filtered.map((item, index) => {
          const label = getLocalizedField(item, "title", locale);
          const thumb = item.thumbnailUrl;
          const playUrl = item.embedUrl || item.videoUrl;
          const embed = isEmbedUrl(playUrl);

          return (
            <article
              key={item.id}
              className={cn(
                "group overflow-hidden rounded-xl border border-border bg-card",
                layout === "list" && "flex gap-4 md:flex-row"
              )}
            >
              <button
                type="button"
                className={cn(
                  "relative block w-full overflow-hidden bg-muted text-left",
                  layout === "list" ? "aspect-video max-w-xs shrink-0" : "aspect-video"
                )}
                onClick={() => enableLightbox && setLightboxIndex(index)}
                aria-label={label || "Play video"}
              >
                {thumb ? (
                  <Image src={thumb} alt={label} fill className="object-cover transition group-hover:scale-[1.02]" sizes="400px" />
                ) : embed ? (
                  <div className="flex h-full min-h-[120px] items-center justify-center bg-black/80 text-white/80 text-sm">
                    Video
                  </div>
                ) : playUrl ? (
                  <EmbedVideoPlayer
                    url={playUrl}
                    controls={showControls}
                    autoplay={autoplayInGrid}
                    muted={autoplayInGrid}
                    loop={loop}
                    preload={preload}
                    className="min-h-[120px]"
                  />
                ) : (
                  <div className="flex aspect-video items-center justify-center text-sm text-muted-foreground">No video</div>
                )}
                {enableLightbox && (
                  <span className="absolute inset-0 flex items-center justify-center bg-black/0 transition group-hover:bg-black/30">
                    <span className="rounded-full bg-white/90 px-4 py-2 text-sm font-medium text-black opacity-0 transition group-hover:opacity-100">
                      Play
                    </span>
                  </span>
                )}
              </button>
              {label && (
                <div className="p-3">
                  <p className="font-medium text-sm">{label}</p>
                  {showCategories && getLocalizedField(item, "category", locale) && (
                    <p className="text-xs text-muted-foreground mt-1">{getLocalizedField(item, "category", locale)}</p>
                  )}
                </div>
              )}
            </article>
          );
        })}
      </div>
      )}
      {filtered.length === 0 && (
        <p className="text-center text-sm text-muted-foreground py-8">No videos to display.</p>
      )}
      <MediaLightbox items={lightboxItems} openIndex={lightboxIndex} onClose={() => setLightboxIndex(null)} />
    </div>
  );
}

function FilterChip({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-full border px-3 py-1 text-xs transition",
        active ? "border-primary bg-primary text-primary-foreground" : "border-border hover:border-primary/50"
      )}
    >
      {label}
    </button>
  );
}
