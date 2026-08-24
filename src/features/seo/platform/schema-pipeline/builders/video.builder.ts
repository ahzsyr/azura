import type { SchemaContext, SchemaNode } from "../types";
import { entityUrl } from "../identity/canonical-url.service";

export const VideoObjectBuilder = {
  id: "video",
  version: 1,
  supports(ctx: SchemaContext): boolean {
    const videoUrl = ctx.page.product?.media?.videos?.find((v) => v.url)?.url;
    return Boolean(videoUrl);
  },
  build(ctx: SchemaContext): SchemaNode[] {
    const videoUrl = ctx.page.product?.media?.videos?.find((v) => v.url)?.url;
    if (!videoUrl) return [];

    const key = `video-${videoUrl}` as const;
    return [
      {
        "@type": "VideoObject",
        "@id": entityUrl(key, ctx),
        contentUrl: videoUrl,
        name: ctx.page.title,
      },
    ];
  },
};
