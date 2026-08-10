"use client";

import type { GalleryAlbumDetailPublic } from "@/features/gallery/types";
import { MasonryGalleryView } from "@/features/builder/blocks/media/components/masonry-gallery-view";
import { getLocalizedField } from "@/lib/utils";

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
        <MasonryGalleryView
          albumMedia={album.media}
          columns={3}
          enableLightbox
          enableFilter={false}
          locale={locale}
        />
      )}
    </div>
  );
}
