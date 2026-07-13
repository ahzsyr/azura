"use client";

import Image from "next/image";
import type { GalleryMediaPublic } from "@/features/gallery/types";
import {
  galleryGridColumnClass,
  galleryImageSizes,
  masonryColumnClass,
  normalizeGalleryColumns,
  type GalleryColumnCount,
} from "@/features/gallery/lib/gallery-layout";
import { getLocalizedField } from "@/lib/utils";
import type { BlockNode } from "@/types/builder";
import type { BlockOverflowContext } from "@/features/builder/components/marketing-items-overflow";
import { MarketingItemsOverflow } from "@/features/builder/components/marketing-items-overflow";
import { cn } from "@/lib/utils";

type Props = {
  media: GalleryMediaPublic[];
  columns: GalleryColumnCount | number;
  locale: string;
  lazyLoad?: boolean;
  variant?: "grid" | "masonry";
  block: BlockNode;
  overflow: BlockOverflowContext;
};

export function GalleryItemsOverflow({
  media,
  columns: rawColumns,
  locale,
  lazyLoad = true,
  variant = "grid",
  block,
  overflow,
}: Props) {
  const columns = normalizeGalleryColumns(rawColumns);
  const isMasonry = variant === "masonry";

  return (
    <MarketingItemsOverflow
      block={block}
      overflowFlags={overflow.flags}
      previewDevice={overflow.previewDevice}
      items={media}
      columns={columns}
      useSimpleSliderTrack={false}
      gridClassName={
        isMasonry
          ? cn(masonryColumnClass(columns), "gap-4")
          : cn("grid gap-4", galleryGridColumnClass(columns))
      }
      getItemKey={(item) => item.id}
      renderItem={(item) => {
        const alt = getLocalizedField(item, "title", locale) || "";
        return (
          <div
            className={cn(
              "overflow-hidden rounded-lg bg-muted",
              isMasonry ? "mb-4 break-inside-avoid" : "relative aspect-[4/3]"
            )}
          >
            {item.mediaKind === "VIDEO" ? (
              <video
                src={item.mediaUrl}
                controls
                className={cn("w-full bg-black", isMasonry ? "h-auto" : "h-full object-cover")}
                preload="metadata"
              />
            ) : isMasonry ? (
              <Image
                src={item.mediaUrl}
                alt={alt}
                width={800}
                height={600}
                className="h-auto w-full object-cover"
                sizes={galleryImageSizes(columns)}
                loading={lazyLoad ? "lazy" : "eager"}
              />
            ) : (
              <Image
                src={item.mediaUrl}
                alt={alt}
                fill
                className="object-cover"
                sizes={galleryImageSizes(columns)}
                loading={lazyLoad ? "lazy" : "eager"}
              />
            )}
          </div>
        );
      }}
    />
  );
}
