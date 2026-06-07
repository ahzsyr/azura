"use client";

import Image from "next/image";
import type { GalleryMediaPublic } from "@/features/gallery/types";
import { getLocalizedField } from "@/lib/utils";
import type { BlockNode } from "@/types/builder";
import type { BlockOverflowContext } from "@/features/builder/components/marketing-items-overflow";
import { MarketingItemsOverflow } from "@/features/builder/components/marketing-items-overflow";
import { cn } from "@/lib/utils";

type Props = {
  media: GalleryMediaPublic[];
  columns: 2 | 3 | 4;
  locale: string;
  lazyLoad?: boolean;
  variant?: "grid" | "masonry";
  block: BlockNode;
  overflow: BlockOverflowContext;
};

function gridClass(columns: 2 | 3 | 4, variant: "grid" | "masonry") {
  if (variant === "masonry") {
    if (columns === 2) return "columns-2";
    if (columns === 4) return "columns-2 md:columns-4";
    return "columns-2 md:columns-3";
  }
  if (columns === 2) return "grid-cols-2";
  if (columns === 4) return "grid-cols-2 md:grid-cols-4";
  return "grid-cols-2 md:grid-cols-3";
}

export function GalleryItemsOverflow({
  media,
  columns,
  locale,
  lazyLoad = true,
  variant = "grid",
  block,
  overflow,
}: Props) {
  const isMasonry = variant === "masonry";

  return (
    <MarketingItemsOverflow
      block={block}
      overflowFlags={overflow.flags}
      previewDevice={overflow.previewDevice}
      items={media}
      columns={columns}
      useSimpleSliderTrack
      gridClassName={
        isMasonry
          ? cn(gridClass(columns, variant), "gap-4")
          : cn("grid gap-4", gridClass(columns, variant))
      }
      getItemKey={(item) => item.id}
      renderItem={(item) => {
        const alt = getLocalizedField(item, "title", locale) || "";
        return (
          <div
            className={cn(
              "relative overflow-hidden rounded-lg bg-muted",
              isMasonry ? "mb-4 break-inside-avoid aspect-[4/3]" : "aspect-[4/3]"
            )}
          >
            <Image
              src={item.mediaUrl}
              alt={alt}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 33vw"
              loading={lazyLoad ? "lazy" : "eager"}
            />
          </div>
        );
      }}
    />
  );
}
