import "server-only";

import { cmsService, type CmsPagePublicView } from "@/features/cms/cms.service";
import { publicViewFromPageCache } from "@/features/cms/page-from-cache";
import { getErrorMessage, isRecoverableDbError } from "@/lib/debug/recoverable-db-error";
import { pageCache } from "@/features/storage/page-cache";

export type PublishedPageSource = "live" | "stale";

export type ResolvedPublishedPage = {
  page: CmsPagePublicView;
  source: PublishedPageSource;
};

/** Load a published CMS page from the database. */
export async function resolvePublishedPageLive(slug: string): Promise<CmsPagePublicView | null> {
  return cmsService.getPublishedPageBySlug(slug);
}

/** Load the last published page payload from JsonStore page-cache (no CmsPage row). */
export async function resolvePublishedPageStale(slug: string): Promise<CmsPagePublicView | null> {
  try {
    const cached = await pageCache.get(slug);
    if (!cached || cached.blocks.length === 0) return null;
    return publicViewFromPageCache(cached);
  } catch (error) {
    console.warn(`[cms] pageCache stale read failed for /${slug}:`, getErrorMessage(error));
    return null;
  }
}

/** Live CMS first; on recoverable DB errors, fall back to stale page-cache. */
export async function resolvePublishedPageWithFallback(
  slug: string,
): Promise<ResolvedPublishedPage | null> {
  try {
    const live = await resolvePublishedPageLive(slug);
    if (live) return { page: live, source: "live" };
  } catch (error) {
    if (!isRecoverableDbError(error)) throw error;
    console.warn(
      `[cms] live page load failed for /${slug}, trying stale cache:`,
      getErrorMessage(error),
    );
    const stale = await resolvePublishedPageStale(slug);
    if (stale) return { page: stale, source: "stale" };
    return null;
  }

  const stale = await resolvePublishedPageStale(slug);
  if (stale) return { page: stale, source: "stale" };
  return null;
}
