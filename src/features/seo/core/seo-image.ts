import type { SeoImage } from "./seo-document";
import { resolveSeoOgImageUrl } from "@/features/seo/seo-image-url";

export type SeoImageSource = {
  pageSocialImage?: string | null;
  featuredImage?: string | null;
  contentImage?: string | null;
  typeDefaultImage?: string | null;
  globalDefaultImage?: string | null;
};

export function resolveSeoImage(
  sources: SeoImageSource,
  siteUrl: string,
  dimensions?: { width?: number; height?: number; alt?: string },
): SeoImage | undefined {
  const candidates = [
    sources.pageSocialImage,
    sources.featuredImage,
    sources.contentImage,
    sources.typeDefaultImage,
    sources.globalDefaultImage,
  ];

  for (const raw of candidates) {
    const url = resolveSeoOgImageUrl(raw, siteUrl);
    if (url) {
      return {
        url,
        width: dimensions?.width ?? 1200,
        height: dimensions?.height ?? 630,
        alt: dimensions?.alt,
      };
    }
  }

  return undefined;
}

export function resolveGlobalDefaultSocialImage(siteUrl: string): string {
  const origin = siteUrl.replace(/\/$/, "");
  return `${origin}/og-default.jpg`;
}
