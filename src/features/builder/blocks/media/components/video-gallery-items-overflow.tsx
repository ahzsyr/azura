"use client";

import Image from "next/image";
import type { VideoGalleryResolvedItem } from "@/features/builder/blocks/media/components/video-gallery-view";
import { EmbedVideoPlayer } from "@/features/builder/blocks/media/components/embed-video-player";
import { isEmbedUrl } from "@/features/builder/blocks/media/lib/embed-video";
import { getLocalizedField } from "@/lib/utils";
import type { BlockNode } from "@/types/builder";
import type { BlockOverflowContext } from "@/features/builder/components/marketing-items-overflow";
import { MarketingItemsOverflow } from "@/features/builder/components/marketing-items-overflow";
import { cn } from "@/lib/utils";

type Props = {
  items: VideoGalleryResolvedItem[];
  columns: 2 | 3 | 4;
  layout: "grid" | "list";
  locale: string;
  enableLightbox: boolean;
  autoplayInGrid: boolean;
  showCategories: boolean;
  showControls: boolean;
  loop: boolean;
  preload: "none" | "metadata" | "auto";
  onPlay: (index: number) => void;
  block: BlockNode;
  overflow: BlockOverflowContext;
};

export function VideoGalleryItemsOverflow({
  items,
  columns,
  layout,
  locale,
  enableLightbox,
  autoplayInGrid,
  showCategories,
  showControls,
  loop,
  preload,
  onPlay,
  block,
  overflow,
}: Props) {
  const colClass =
    columns === 2 ? "grid-cols-1 sm:grid-cols-2" : columns === 4 ? "grid-cols-2 md:grid-cols-4" : "grid-cols-1 sm:grid-cols-2 md:grid-cols-3";

  return (
    <MarketingItemsOverflow
      block={block}
      overflowFlags={overflow.flags}
      previewDevice={overflow.previewDevice}
      items={items}
      columns={columns}
      useSimpleSliderTrack={false}
      gridClassName={cn(layout === "list" ? "flex flex-col gap-4" : `grid gap-4 ${colClass}`)}
      getItemKey={(item) => item.id}
      renderItem={(item, index) => {
        const label = getLocalizedField(item, "title", locale);
        const thumb = item.thumbnailUrl;
        const playUrl = item.embedUrl || item.videoUrl;
        const embed = isEmbedUrl(playUrl);

        return (
          <article
            className={cn(
              "group min-w-[280px] overflow-hidden rounded-xl border border-border bg-card",
              layout === "list" && "flex gap-4 md:flex-row"
            )}
          >
            <button
              type="button"
              className={cn(
                "relative block w-full overflow-hidden bg-muted text-left",
                layout === "list" ? "aspect-video max-w-xs shrink-0" : "aspect-video"
              )}
              onClick={() => enableLightbox && onPlay(index)}
              aria-label={label || "Play video"}
            >
              {thumb ? (
                <Image src={thumb} alt={label} fill className="object-cover" sizes="400px" />
              ) : embed ? (
                <div className="flex h-full min-h-[120px] items-center justify-center bg-black/80 text-sm text-white/80">
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
                <div className="flex aspect-video items-center justify-center text-sm text-muted-foreground">
                  No video
                </div>
              )}
            </button>
            {label && (
              <div className="p-3">
                <p className="text-sm font-medium">{label}</p>
                {showCategories && getLocalizedField(item, "category", locale) && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    {getLocalizedField(item, "category", locale)}
                  </p>
                )}
              </div>
            )}
          </article>
        );
      }}
    />
  );
}
