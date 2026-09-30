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
import { cn } from "@/lib/utils";

type Props = {
  media: GalleryMediaPublic[];
  columns: GalleryColumnCount | number;
  locale: string;
  lazyLoad?: boolean;
  variant?: "grid" | "masonry";
  onItemClick?: (item: GalleryMediaPublic) => void;
};

export function GalleryBlockGrid({
  media,
  columns: rawColumns,
  locale,
  lazyLoad = true,
  variant = "grid",
  onItemClick,
}: Props) {
  if (media.length === 0) return null;

  const columns = normalizeGalleryColumns(rawColumns);
  const isMasonry = variant === "masonry";
  const clickable = Boolean(onItemClick);

  return (
    <div
      className={
        isMasonry
          ? cn(masonryColumnClass(columns), "gap-4")
          : cn("grid gap-4", galleryGridColumnClass(columns))
      }
    >
      {media.map((item) => {
        const alt = getLocalizedField(item, "title", locale) || "";

        return (
          <div
            key={item.id}
            role={clickable ? "button" : undefined}
            tabIndex={clickable ? 0 : undefined}
            onClick={clickable ? () => onItemClick?.(item) : undefined}
            onKeyDown={
              clickable
                ? (e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      onItemClick?.(item);
                    }
                  }
                : undefined
            }
            className={cn(
              "overflow-hidden rounded-lg bg-muted",
              isMasonry ? "mb-4 break-inside-avoid" : "relative aspect-square",
              clickable &&
                "cursor-zoom-in focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
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
                loading={lazyLoad ? "lazy" : "eager"}
                sizes={galleryImageSizes(columns)}
              />
            ) : (
              <Image
                src={item.mediaUrl}
                alt={alt}
                fill
                className="object-cover"
                loading={lazyLoad ? "lazy" : "eager"}
                sizes={galleryImageSizes(columns)}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
