/** Thumbnail / publish readiness checks for Video watch pages. SVG is never allowed as a poster. */

const JPG_PNG_MIME = /^(image\/jpeg|image\/jpg|image\/png)$/i;
const JPG_PNG_EXT = /\.(jpe?g|png)(\?|#|$)/i;
const SVG_MIME = /^image\/svg\+xml$/i;
const SVG_EXT = /\.svg(\?|#|$)/i;

export function isSvgThumbnail(mimeOrUrl: string | null | undefined): boolean {
  const value = mimeOrUrl?.trim() ?? "";
  if (!value) return false;
  return SVG_MIME.test(value) || SVG_EXT.test(value);
}

export function isJpgOrPngThumbnail(
  mimeType?: string | null,
  url?: string | null,
): boolean {
  if (isSvgThumbnail(mimeType) || isSvgThumbnail(url)) return false;
  if (mimeType?.trim() && JPG_PNG_MIME.test(mimeType.trim())) return true;
  if (url?.trim() && JPG_PNG_EXT.test(url.trim())) return true;
  return false;
}

export type VideoPublishReadyInput = {
  title?: string | null;
  description?: string | null;
  contentMedia?: { url?: string | null; mimeType?: string | null; mediaType?: string | null } | null;
  thumbnailMedia?: { url?: string | null; mimeType?: string | null; mediaType?: string | null } | null;
  contentUrl?: string | null;
  thumbnailUrl?: string | null;
  thumbnailMimeType?: string | null;
};

export function isVideoPublishReady(video: VideoPublishReadyInput): boolean {
  const title = video.title?.trim();
  const description = video.description?.trim();
  if (!title || !description) return false;

  const contentUrl = video.contentMedia?.url?.trim() || video.contentUrl?.trim();
  if (!contentUrl) return false;
  const contentMime = video.contentMedia?.mimeType?.trim() ?? "";
  const contentType = video.contentMedia?.mediaType?.trim() ?? "";
  const looksLikeVideo =
    contentType === "VIDEO" ||
    /^video\//i.test(contentMime) ||
    /\.(mp4|webm|mov|ogg|m4v)(\?|#|$)/i.test(contentUrl);
  if (!looksLikeVideo) return false;

  const thumbUrl = video.thumbnailMedia?.url?.trim() || video.thumbnailUrl?.trim();
  const thumbMime =
    video.thumbnailMedia?.mimeType?.trim() || video.thumbnailMimeType?.trim() || null;
  if (video.thumbnailMedia?.mediaType === "SVG") return false;
  if (!isJpgOrPngThumbnail(thumbMime, thumbUrl)) return false;

  return true;
}
