import type { Locale } from "@/i18n/routing";
import { getGalleryBySlug } from "@/lib/data";
import { getLocalizedField } from "@/lib/utils";
import { translationService } from "@/features/translation/translation.service";
import { parseVideoGalleryProps } from "@/features/media-blocks/lib/parse-block-props";
import { VideoGalleryView, type VideoGalleryResolvedItem } from "@/features/media-blocks/components/video-gallery-view";
import type { VideoGalleryItem } from "@/features/media-blocks/schemas/media-blocks";
import type { BlockNode } from "@/types/builder";
import type { BlockOverflowContext } from "@/features/builder/components/marketing-items-overflow";

type Props = {
  locale: Locale;
  props: Record<string, unknown>;
  previewMode?: boolean;
  block?: BlockNode;
  overflow?: BlockOverflowContext;
};

function resolvePlayUrl(item: VideoGalleryItem): string {
  return item.embedUrl || item.videoUrl;
}

export async function VideoGalleryBlockRenderer({
  locale,
  props: raw,
  previewMode,
  block,
  overflow,
}: Props) {
  const p = parseVideoGalleryProps(raw);
  let items: VideoGalleryResolvedItem[] = [];

  if (p.source === "album" && p.gallerySlug) {
    const album = await getGalleryBySlug(p.gallerySlug);
    if (album) {
      const videos = album.media.filter((m) => m.mediaKind === "VIDEO");
      const limited = p.limit > 0 ? videos.slice(0, p.limit) : videos;
      const translationsByMediaId = await translationService.getForEntities(
        "GalleryMedia",
        limited.map((m) => m.id),
      );
      items = limited.map((m) => {
        const mediaRecord = m as Record<string, unknown>;
        const translations = translationsByMediaId.get(m.id);
        return {
          id: m.id,
          videoUrl: m.mediaUrl,
          videoMediaAssetId: "",
          embedUrl: "",
          thumbnailUrl: "",
          thumbnailMediaAssetId: "",
          title: getLocalizedField(mediaRecord, "title", locale, {
            translations,
            includeLegacySuffixFields: true,
          }),
          category: getLocalizedField(mediaRecord, "info", locale, {
            translations,
            includeLegacySuffixFields: true,
          }),
          playlistId: "",
          playUrl: m.mediaUrl,
        };
      });
    }
  } else {
    const inline = p.limit > 0 ? p.items.slice(0, p.limit) : p.items;
    items = inline.map((item) => ({ ...item, playUrl: resolvePlayUrl(item) }));
  }

  if (items.length === 0 && previewMode) {
    return (
      <p className="text-center text-sm text-muted-foreground py-8 border border-dashed rounded-lg">
        No videos configured. Add inline items or link a gallery album.
      </p>
    );
  }

  if (items.length === 0) return null;

  return (
    <VideoGalleryView
      title={getLocalizedField(p, "title", locale) || undefined}
      subtitle={getLocalizedField(p, "subtitle", locale) || undefined}
      items={items}
      columns={p.columns}
      layout={p.layout}
      enableLightbox={p.enableLightbox}
      autoplayInGrid={p.autoplayInGrid}
      showCategories={p.showCategories}
      showControls={p.showControls}
      loop={p.loop}
      preload={p.preload}
      locale={locale}
      block={block}
      overflow={overflow}
    />
  );
}
