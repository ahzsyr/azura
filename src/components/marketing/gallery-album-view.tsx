"use client";

import { OptimizedImage } from "@/components/ui/optimized-image";
import { IMAGE_SIZES } from "@/lib/config/performance";
import type { GalleryAlbumDetailPublic } from "@/features/gallery/types";
import { cn, getLocalizedField } from "@/lib/utils";

type Props = {
  album: GalleryAlbumDetailPublic;
  locale: string;
};

export function GalleryAlbumView({ album, locale }: Props) {
  const title = getLocalizedField(album, "title", locale);
  const excerpt = getLocalizedField(album, "excerpt", locale);
  const description = getLocalizedField(album, "description", locale);
  const info = getLocalizedField(album, "info", locale);

  return (
    <div>
      <div className="mb-8 max-w-3xl">
        <h2 className="font-heading text-2xl font-semibold">{title}</h2>
        {excerpt && <p className="mt-2 text-muted-foreground">{excerpt}</p>}
        {description && <p className="mt-4 whitespace-pre-line text-sm leading-relaxed">{description}</p>}
        {info && <p className="mt-3 text-sm text-muted-foreground">{info}</p>}
      </div>

      {album.media.length === 0 ? (
        <p className="text-center text-muted-foreground">No media in this gallery yet.</p>
      ) : (
        <div className="columns-1 gap-4 sm:columns-2 lg:columns-3">
          {album.media.map((item) => {
            const itemTitle = getLocalizedField(item, "title", locale);
            const itemExcerpt = getLocalizedField(item, "excerpt", locale);
            const itemDescription = getLocalizedField(item, "description", locale);
            const itemInfo = getLocalizedField(item, "info", locale);

            return (
              <figure key={item.id} className="mb-4 break-inside-avoid overflow-hidden rounded-xl border bg-card">
                {item.mediaKind === "VIDEO" ? (
                  <video
                    src={item.mediaUrl}
                    controls
                    className="w-full bg-black"
                    preload="metadata"
                  />
                ) : (
                  <OptimizedImage
                    src={item.mediaUrl}
                    alt={itemTitle}
                    width={600}
                    height={400}
                    className="w-full object-cover"
                    sizes={IMAGE_SIZES.gallery}
                  />
                )}
                <figcaption className="space-y-1 p-3">
                  <p className={cn("text-sm font-medium", !itemTitle && "text-muted-foreground")}>
                    {itemTitle || "Untitled"}
                  </p>
                  {itemExcerpt && <p className="text-xs text-muted-foreground">{itemExcerpt}</p>}
                  {itemDescription && (
                    <p className="text-xs leading-relaxed text-muted-foreground whitespace-pre-line">
                      {itemDescription}
                    </p>
                  )}
                  {itemInfo && <p className="text-xs text-muted-foreground/80">{itemInfo}</p>}
                </figcaption>
              </figure>
            );
          })}
        </div>
      )}
    </div>
  );
}
