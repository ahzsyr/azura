/** Cover media row stored on a catalog content item. */
export type ContentCoverMedia = {
  url?: string | null;
  isCover?: boolean;
  sortOrder?: number;
  isHidden?: boolean;
  isPublished?: boolean;
};

/** Prefer the published cover image, then the first visible media, then the featured image. */
export function resolveContentCoverUrl(input: {
  featuredImageUrl?: string | null;
  media?: ContentCoverMedia[] | null;
}): string | null {
  const visible = (input.media ?? [])
    .filter((media) => {
      if (!media.url?.trim()) return false;
      if (media.isHidden) return false;
      if (media.isPublished === false) return false;
      return true;
    })
    .sort((a, b) => {
      const coverDelta = Number(Boolean(b.isCover)) - Number(Boolean(a.isCover));
      if (coverDelta !== 0) return coverDelta;
      return (a.sortOrder ?? 0) - (b.sortOrder ?? 0);
    });

  return visible[0]?.url?.trim() || input.featuredImageUrl?.trim() || null;
}
