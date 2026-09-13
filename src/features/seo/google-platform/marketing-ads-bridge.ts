import "server-only";
import type { GoogleIntegrationContext } from "@/features/seo/google-platform/types";
import { getGoogleAdsOperationalContext } from "@/modules/marketing/providers/google-ads/health";
import { mapOperationalToMarketingContext } from "@/modules/marketing/providers/google-ads/readiness";
import { migrateMarketingAdsCredentialsIntoSeo } from "@/modules/marketing/providers/google-ads/migrate-seo-credentials";
import { getGoogleAdsOperationalCredentials } from "@/features/seo/google-platform/ads-credentials";

export type MarketingGoogleAdsContext = NonNullable<
  GoogleIntegrationContext["marketingGoogleAds"]
>;

export { mapOperationalToMarketingContext } from "@/modules/marketing/providers/google-ads/readiness";

/**
 * Resolve Google Ads operational context for SEO + Marketing.
 * SEO → Google owns credentials/OAuth; this surfaces shared readiness.
 */
export async function loadMarketingGoogleAdsContext(): Promise<MarketingGoogleAdsContext> {
  try {
    await migrateMarketingAdsCredentialsIntoSeo().catch(() => undefined);

    const seo = await getGoogleAdsOperationalCredentials();
    const legacyHint =
      seo.customerId && !seo.invalidCustomerIdRaw ? seo.customerId : null;

    const ops = await getGoogleAdsOperationalContext(null, {
      legacySeoCustomerIdHint: legacyHint,
    });

    return mapOperationalToMarketingContext(ops);
  } catch {
    return {
      connected: false,
      oauthConnected: false,
      operational: false,
      readiness: "not_connected",
    };
  }
}
