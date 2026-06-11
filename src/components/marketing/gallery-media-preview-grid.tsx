"use client";

import { Link } from "@/i18n/navigation";
import { OptimizedImage } from "@/components/ui/optimized-image";
import { IMAGE_SIZES } from "@/lib/config/performance";
import type { GalleryHomePreviewItem } from "@/features/gallery/types";
import { getLocalizedField } from "@/lib/utils";

type Props = {
  items: GalleryHomePreviewItem[];
  locale: string;
};

export function GalleryMediaPreviewGrid({ items, locale }: Props) {
  if (items.length === 0) return null;

  return (
    <div className="columns-1 gap-4 sm:columns-2 lg:columns-3">
      {items.map((item) => (
        <Link
          key={item.id}
          href={`/gallery/${item.gallerySlug}`}
          className="group mb-4 block break-inside-avoid overflow-hidden rounded-xl"
        >
          {item.mediaKind === "VIDEO" ? (
            <video
              src={item.mediaUrl}
              muted
              playsInline
              className="w-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
          ) : (
            <OptimizedImage
              src={item.mediaUrl}
              alt={getLocalizedField(item, "title", locale)}
              width={600}
              height={400}
              className="w-full object-cover transition-transform duration-500 group-hover:scale-105"
              sizes={IMAGE_SIZES.gallery}
            />
          )}
          <p className="mt-2 text-sm text-muted-foreground">
            {getLocalizedField(item, "title", locale)}
          </p>
        </Link>
      ))}
    </div>
  );
}
