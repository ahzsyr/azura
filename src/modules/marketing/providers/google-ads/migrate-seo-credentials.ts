import "server-only";
import { getGooglePlatformState } from "@/features/seo/google-platform/persistence";
import { writeSeoAdsApiFields } from "@/features/seo/google-platform/ads-credentials";
import { getProviderAppCredentials } from "@/modules/marketing/providers/app-config";
import { GOOGLE_ADS_PROVIDER_ID } from "@/modules/marketing/providers/google-ads/manifest";
import { parseGoogleAdsCustomerId } from "@/modules/marketing/providers/google-ads/sdk/api";

const BACKFILL_FLAG = "marketingAdsCredentialsBackfilledToSeoAt";

/**
 * One-time: copy Marketing Google Ads developerToken / loginCustomerId into SEO Ads
 * configuration when SEO fields are empty. Then SEO remains the source of truth.
 */
export async function migrateMarketingAdsCredentialsIntoSeo(): Promise<{
  migrated: boolean;
  legacySeoCustomerIdHint: string | null;
}> {
  try {
    const [mktCreds, platform] = await Promise.all([
      getProviderAppCredentials(GOOGLE_ADS_PROVIDER_ID),
      getGooglePlatformState(),
    ]);
    const seoCfg = (platform.services?.ads?.configuration ?? {}) as Record<string, unknown>;
    const metadata = { ...((mktCreds.metadata ?? {}) as Record<string, unknown>) };

    const seoDeveloperToken =
      typeof seoCfg.developerToken === "string" ? seoCfg.developerToken.trim() : "";
    const seoManager = parseGoogleAdsCustomerId(String(seoCfg.managerAccountId ?? ""));
    const seoCustomer = parseGoogleAdsCustomerId(String(seoCfg.customerId ?? ""));

    if (metadata[BACKFILL_FLAG] || (seoDeveloperToken && seoManager)) {
      return {
        migrated: false,
        legacySeoCustomerIdHint: seoCustomer || null,
      };
    }

    const mktToken =
      typeof metadata.developerToken === "string" ? String(metadata.developerToken).trim() : "";
    const mktLogin = parseGoogleAdsCustomerId(String(metadata.loginCustomerId ?? ""));

    const patch: {
      developerToken?: string;
      managerAccountId?: string;
      customerId?: string;
    } = {};
    let changed = false;
    if (!seoDeveloperToken && mktToken && !mktToken.startsWith("has_")) {
      patch.developerToken = mktToken;
      changed = true;
    }
    if (!seoManager && mktLogin) {
      patch.managerAccountId = mktLogin;
      changed = true;
    }
    if (!seoCustomer) {
      // keep SEO customer empty — do not invent from Marketing alone unless SEO already had it
    }

    if (changed) {
      await writeSeoAdsApiFields(patch);
    }

    // Mark on Marketing metadata so we do not re-run forever (best-effort)
    try {
      const { upsertProviderAppConfig } = await import(
        "@/modules/marketing/providers/app-config"
      );
      await upsertProviderAppConfig({
        providerId: GOOGLE_ADS_PROVIDER_ID,
        clientId: mktCreds.clientId,
        metadata: {
          ...metadata,
          [BACKFILL_FLAG]: new Date().toISOString(),
        },
      });
    } catch {
      // ignore — SEO write is the important part
    }

    const refreshed = await getGooglePlatformState();
    const hint = parseGoogleAdsCustomerId(
      String(refreshed.services?.ads?.configuration?.customerId ?? ""),
    );

    return {
      migrated: changed,
      legacySeoCustomerIdHint: hint || seoCustomer || null,
    };
  } catch {
    return { migrated: false, legacySeoCustomerIdHint: null };
  }
}

/** @deprecated Use migrateMarketingAdsCredentialsIntoSeo — ownership inverted */
export async function migrateSeoAdsCredentialsIntoMarketing(): Promise<{
  migrated: boolean;
  legacySeoCustomerIdHint: string | null;
}> {
  return migrateMarketingAdsCredentialsIntoSeo();
}
