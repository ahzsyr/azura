import Image from "next/image";
import type { GalleryMediaPublic } from "@/features/gallery/types";
import { getLocalizedField } from "@/lib/utils";
import { cn } from "@/lib/utils";

type Props = {
  media: GalleryMediaPublic[];
  columns: 2 | 3 | 4;
  locale: string;
  lazyLoad?: boolean;
  variant?: "grid" | "masonry";
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

export function GalleryBlockGrid({ media, columns, locale, lazyLoad = true, variant = "grid" }: Props) {
  if (media.length === 0) return null;

  const isMasonry = variant === "masonry";

  return (
    <div className={isMasonry ? `${gridClass(columns, variant)} gap-4` : `grid gap-4 ${gridClass(columns, variant)}`}>
      {media.map((item) => {
        const alt = getLocalizedField(item, "title", locale) || "";
        return (
          <div
            key={item.id}
            className={cn(
              "relative overflow-hidden rounded-lg bg-muted",
              isMasonry ? "mb-4 break-inside-avoid aspect-auto min-h-[180px]" : "aspect-square"
            )}
          >
            {item.mediaKind === "VIDEO" ? (
              <video
                src={item.mediaUrl}
                controls
                className="h-full w-full object-cover"
                preload="metadata"
              />
            ) : (
              <Image
                src={item.mediaUrl}
                alt={alt}
                fill
                className="object-cover"
                loading={lazyLoad ? "lazy" : "eager"}
                sizes="300px"
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
