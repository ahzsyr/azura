import type { Locale } from "@/i18n/routing";
import { getGalleryBySlug } from "@/lib/data";
import { getLocalizedField } from "@/lib/utils";
import { parseMasonryGalleryProps } from "@/features/builder/blocks/media/lib/parse-block-props";
import { MasonryGalleryView } from "@/features/builder/blocks/media/components/masonry-gallery-view";
import type { BlockNode } from "@/types/builder";
import type { BlockOverflowContext } from "@/features/builder/components/marketing-items-overflow";

type Props = {
  locale: Locale;
  props: Record<string, unknown>;
  previewMode?: boolean;
  block?: BlockNode;
  overflow?: BlockOverflowContext;
};

export async function MasonryGalleryBlockRenderer({
  locale,
  props: raw,
  previewMode,
  block,
  overflow,
}: Props) {
  const p = parseMasonryGalleryProps(raw);

  let albumMedia: NonNullable<Awaited<ReturnType<typeof getGalleryBySlug>>>["media"] | undefined;
  if (p.source === "album" && p.gallerySlug) {
    const album = await getGalleryBySlug(p.gallerySlug);
    if (album) {
      albumMedia = p.limit > 0 ? album.media.slice(0, p.limit) : album.media;
    }
  }

  const inlineItems = p.source === "inline" ? (p.limit > 0 ? p.items.slice(0, p.limit) : p.items) : [];
  const hasContent = (albumMedia?.length ?? 0) > 0 || inlineItems.length > 0;

  if (!hasContent && previewMode) {
    return (
      <p className="text-center text-sm text-muted-foreground py-8 border border-dashed rounded-lg">
        No media items. Add inline items or link a gallery album.
      </p>
    );
  }

  if (!hasContent) return null;

  return (
    <MasonryGalleryView
      title={getLocalizedField(p, "title", locale) || undefined}
      subtitle={getLocalizedField(p, "subtitle", locale) || undefined}
      albumMedia={albumMedia}
      inlineItems={inlineItems}
      columns={p.columns}
      enableLightbox={p.enableLightbox}
      enableFilter={p.enableFilter}
      lazyLoad={p.lazyLoad}
      locale={locale}
      block={block}
      overflow={overflow}
    />
  );
}
