import type { SchemaContext, SchemaNode } from "../types";
import { entityUrl } from "../identity/canonical-url.service";
import { forceApexOrigin } from "@/lib/preferred-host";
import { sanitizeMetadataAbsoluteUrl } from "@/lib/metadata/absolute-url";

function absoluteContentUrl(raw: string | undefined, siteOrigin: string): string | undefined {
  if (!raw?.trim()) return undefined;
  const origin = (forceApexOrigin(siteOrigin) ?? siteOrigin).replace(/\/$/, "");
  return sanitizeMetadataAbsoluteUrl(raw, origin) ?? raw.trim();
}

function watchVideoNode(ctx: SchemaContext): SchemaNode | null {
  const video = ctx.page.video;
  if (!video?.contentUrl?.trim()) return null;

  const contentUrl = absoluteContentUrl(video.contentUrl, ctx.runtime.siteOrigin);
  if (!contentUrl) return null;

  const key = `video-${video.slug ?? contentUrl}` as const;
  const node: SchemaNode = {
    "@type": "VideoObject",
    "@id": entityUrl(key, ctx),
    name: video.name?.trim() || ctx.page.title,
    contentUrl,
  };

  if (video.description?.trim()) node.description = video.description.trim();
  if (video.thumbnailUrl?.trim()) {
    const thumb = absoluteContentUrl(video.thumbnailUrl, ctx.runtime.siteOrigin);
    if (thumb) node.thumbnailUrl = [thumb];
  }
  // Never invent uploadDate — only emit when provided by the page.
  if (video.uploadDate?.trim()) node.uploadDate = video.uploadDate.trim();
  if (video.duration?.trim()) node.duration = video.duration.trim();

  return node;
}

function productVideoNode(ctx: SchemaContext): SchemaNode | null {
  const videoUrl = ctx.page.product?.media?.videos?.find((v) => v.url)?.url;
  if (!videoUrl) return null;

  const contentUrl = absoluteContentUrl(videoUrl, ctx.runtime.siteOrigin) ?? videoUrl;
  const key = `video-${videoUrl}` as const;
  const poster = ctx.page.product?.media?.videos?.find((v) => v.url === videoUrl)?.poster;

  const node: SchemaNode = {
    "@type": "VideoObject",
    "@id": entityUrl(key, ctx),
    contentUrl,
    name: ctx.page.title,
  };
  if (poster?.trim()) {
    const thumb = absoluteContentUrl(poster, ctx.runtime.siteOrigin);
    if (thumb) node.thumbnailUrl = [thumb];
  }
  return node;
}

export const VideoObjectBuilder = {
  id: "video",
  version: 1,
  supports(ctx: SchemaContext): boolean {
    return Boolean(ctx.page.video?.contentUrl || ctx.page.product?.media?.videos?.find((v) => v.url)?.url);
  },
  build(ctx: SchemaContext): SchemaNode[] {
    const watch = watchVideoNode(ctx);
    if (watch) return [watch];
    const product = productVideoNode(ctx);
    return product ? [product] : [];
  },
};
