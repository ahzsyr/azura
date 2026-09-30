import { forceApexOrigin } from "@/lib/preferred-host";
import { publicLocaleAbsoluteUrl } from "@/i18n/url-helpers";
import { getEnabledUrlPrefixes } from "@/i18n/locale-registry.server";
import { FALLBACK_LOCALES } from "@/i18n/locale-config";
import { localeService } from "@/features/i18n/locale.service";
import { videoService } from "@/features/videos/video.service";
import type { VideoSitemapEntry } from "./sitemap-index.service";

/**
 * Load published, SEO-ready videos for video-sitemap.xml.
 * publicationDate is only set from Video.uploadDate (never invented).
 */
export async function loadVideoSitemapEntries(siteOrigin: string): Promise<VideoSitemapEntry[]> {
  const siteUrl = (forceApexOrigin(siteOrigin) ?? siteOrigin).replace(/\/$/, "");
  let localePrefixes: string[] = [];
  try {
    localePrefixes = await getEnabledUrlPrefixes();
  } catch {
    localePrefixes = FALLBACK_LOCALES.map((l) => l.urlPrefix);
  }
  if (!localePrefixes.length) {
    localePrefixes = FALLBACK_LOCALES.map((l) => l.urlPrefix);
  }

  let defaultPrefix = localePrefixes[0] ?? "en";
  try {
    const enabled = await localeService.listEnabled();
    defaultPrefix = enabled.find((l) => l.isDefault)?.urlPrefix ?? defaultPrefix;
  } catch {
    // keep fallback
  }

  let videos: Awaited<ReturnType<typeof videoService.listPublished>> = [];
  try {
    videos = await videoService.listPublished();
  } catch {
    return [];
  }

  const entries: VideoSitemapEntry[] = [];
  for (const video of videos) {
    if (!video.contentUrl || !video.thumbnailUrl) continue;
    for (const localePrefix of localePrefixes) {
      entries.push({
        url: publicLocaleAbsoluteUrl(siteUrl, localePrefix, `/videos/${video.slug}`, defaultPrefix),
        lastModified: video.uploadDate,
        video: {
          title: video.title,
          description: video.description,
          thumbnailLoc: video.thumbnailUrl,
          contentLoc: video.contentUrl,
          duration: video.duration && /^\d+$/.test(video.duration.trim()) ? video.duration.trim() : undefined,
          publicationDate: video.uploadDate.toISOString(),
        },
      });
    }
  }
  return entries;
}
