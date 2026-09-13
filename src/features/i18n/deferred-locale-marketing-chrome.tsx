import { cache, Suspense } from "react";
import { readSiteSettings } from "@/features/catalog/site-settings.service";
import { resolveSitePopups } from "@/features/popups/resolve-site-popups";
import type { ResolvedSitePopups } from "@/features/popups/resolve-site-popups";
import { seoService } from "@/features/seo/seo.service";
import { resolveActiveSiteTrackings } from "@/features/seo/tracking/resolve-tracking";
import type { ActiveSiteTracking } from "@/features/seo/tracking/resolve-tracking";
import type { SeoTrackingConfig } from "@/features/seo/types";
import { resolveActiveMetaPixel } from "@/modules/marketing/tracking/resolve-meta-pixel.server";
import type { ActiveMetaPixel } from "@/modules/marketing/tracking/resolve-meta-pixel.server";
import { SiteTracking } from "@/components/analytics/site-tracking";
import { MetaPixelNoscript } from "@/components/analytics/meta-pixel";
import Script from "next/script";
import { resolveMetaPixelInitScript } from "@/modules/marketing/tracking/meta-pixel";
import { MarketingAttributionBootstrap } from "@/features/marketing-attribution/bootstrap";
import { DeferredGlobalPopupHost } from "@/features/popups/components/deferred-global-popup-host";
import { SearchWarmCacheHost } from "@/capabilities/search/query/search-warm-cache-host";

export type DeferredLocaleMarketingData = {
  siteTracking: ActiveSiteTracking[];
  metaPixel: ActiveMetaPixel | null;
  popupSettings: ResolvedSitePopups;
};

/** Non-critical marketing chrome — must not block critical shell HTML. */
export const loadDeferredLocaleMarketingData = cache(
  async (locale: string): Promise<DeferredLocaleMarketingData> => {
    const [siteSettings, trackingConfig, metaPixel] = await Promise.all([
      readSiteSettings(locale).catch(() => ({})),
      seoService.getTrackingConfig().catch(() => ({} as SeoTrackingConfig)),
      resolveActiveMetaPixel().catch(() => null),
    ]);

    return {
      siteTracking: resolveActiveSiteTrackings(trackingConfig),
      metaPixel,
      popupSettings: resolveSitePopups(siteSettings),
    };
  },
);

type Props = {
  locale: string;
};

/**
 * Deferred Meta Pixel — afterInteractive only.
 * beforeInteractive is illegal outside the root layout and 500s in production
 * when this island streams under Suspense.
 */
function DeferredMetaPixel({
  pixelId,
  headSnippet,
}: {
  pixelId: string;
  headSnippet?: string;
}) {
  return (
    <>
      <Script
        id={`meta-pixel-deferred-${pixelId}`}
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: resolveMetaPixelInitScript(pixelId, headSnippet),
        }}
      />
      <MetaPixelNoscript pixelId={pixelId} headSnippet={headSnippet} />
    </>
  );
}

/**
 * Deferred marketing islands: tracking, Meta Pixel, popups, search warm-cache.
 * Render inside Suspense so critical shell can stream without waiting.
 * Errors are swallowed — never take down the public shell.
 */
export async function DeferredLocaleMarketingChrome({ locale }: Props) {
  try {
    const { siteTracking, metaPixel, popupSettings } =
      await loadDeferredLocaleMarketingData(locale);

    return (
      <>
        <SiteTracking tracking={siteTracking} />
        {metaPixel ? (
          <DeferredMetaPixel
            pixelId={metaPixel.pixelId}
            headSnippet={metaPixel.headSnippet}
          />
        ) : null}
        <Suspense fallback={null}>
          <MarketingAttributionBootstrap />
        </Suspense>
        <DeferredGlobalPopupHost settings={popupSettings} />
        <SearchWarmCacheHost />
      </>
    );
  } catch (error) {
    console.error("[DeferredLocaleMarketingChrome] skipped:", error);
    return null;
  }
}
