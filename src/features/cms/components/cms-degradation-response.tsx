import "server-only";

import type { ReactNode } from "react";
import type { Locale } from "@/i18n/routing";
import { HomeFallbackLanding } from "@/components/marketing/home/home-fallback-landing";
import { resolveHomePage } from "@/features/cms/resolve-home-page";
import { resolvePublishedPageStale } from "@/features/cms/resolve-published-page";
import { CmsPageRenderer } from "@/features/cms/components/cms-page-renderer";
import { MarketingMaintenancePage } from "@/features/cms/components/marketing-maintenance-page";

type Options = {
  /** When live load already failed, skip another DB round-trip for home. */
  skipLive?: boolean;
  /** When true, skip CmsPageRenderer and serve static fallback only (breaks render loops). */
  terminal?: boolean;
};

/** Slug-aware CMS degradation: stale cache, then home fallback landing or maintenance page. */
export async function renderCmsDegradationResponse(
  slug: string,
  locale: Locale,
  options: Options = {},
): Promise<ReactNode> {
  if (slug === "home") {
    if (!options.terminal) {
      const resolution = await resolveHomePage({ skipLive: options.skipLive });
      if (resolution.kind === "cms") {
        return await CmsPageRenderer({
          slug,
          locale,
          page: resolution.page,
          fromDegradation: true,
        });
      }
    }
    return await HomeFallbackLanding({ locale });
  }

  if (!options.terminal) {
    const stale = await resolvePublishedPageStale(slug);
    if (stale) {
      console.warn(`[cms] serving stale page-cache for /${slug}`);
      return await CmsPageRenderer({ slug, locale, page: stale, fromDegradation: true });
    }
  }

  console.warn(`[cms] no stale cache for /${slug} — showing maintenance page`);
  return <MarketingMaintenancePage locale={locale} />;
}
