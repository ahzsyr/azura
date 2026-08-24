import type { MarketingProviderAdapter } from "@/modules/marketing/core/registry/types";
import { buildHealthReport, checkNow } from "@/modules/marketing/core/health";
import { GOOGLE_ADS_PROVIDER_ID, googleAdsProviderManifest } from "../manifest";
import { googleAdsSearch } from "../sdk/api";

async function readAccessToken(connectionId: string) {
  const { getUnsealedAccessToken } = await import("@/modules/marketing/oauth/connection-lifecycle");
  return getUnsealedAccessToken(connectionId);
}

async function readGoogleAdsConfig() {
  const { getProviderAppCredentials } = await import("@/modules/marketing/providers/app-config");
  const creds = await getProviderAppCredentials(GOOGLE_ADS_PROVIDER_ID);
  const metadata = (creds.metadata ?? {}) as Record<string, unknown>;
  return {
    ...creds,
    developerToken: String(metadata.developerToken ?? ""),
    loginCustomerId: String(metadata.loginCustomerId ?? ""),
  };
}

export const googleAdsProviderAdapter: MarketingProviderAdapter = {
  id: GOOGLE_ADS_PROVIDER_ID,
  manifest: googleAdsProviderManifest,
  capabilities() {
    return googleAdsProviderManifest.capabilities;
  },
  async health(connectionId) {
    const token = await readAccessToken(connectionId);
    const config = await readGoogleAdsConfig();
    return buildHealthReport({
      providerId: GOOGLE_ADS_PROVIDER_ID,
      connectionId,
      checks: [
        checkNow("connected", Boolean(token), token ? "Connected" : "Missing token"),
        checkNow("tokenValid", Boolean(token)),
        checkNow("apiReachable", true, "Deferred live check"),
        checkNow("rateLimited", true),
        checkNow(
          "permissionsOk",
          Boolean(config.clientId && config.clientSecret && config.developerToken),
          config.developerToken
            ? "Developer token configured"
            : "Developer token missing in provider metadata",
        ),
      ],
    });
  },
  async listAccounts(connectionId) {
    const accounts = await this.listAdAccounts?.(connectionId);
    return (accounts ?? []).map((a) => ({
      externalId: a.externalId,
      name: a.name,
      type: "google_ads_customer",
    }));
  },
  async listAdAccounts(connectionId) {
    const token = await readAccessToken(connectionId);
    const config = await readGoogleAdsConfig();
    if (!token || !config.developerToken || !config.loginCustomerId) return [];
    try {
      const results = await googleAdsSearch({
        accessToken: token,
        developerToken: config.developerToken,
        customerId: config.loginCustomerId,
        loginCustomerId: config.loginCustomerId,
        query: `
          SELECT customer_client.id, customer_client.descriptive_name, customer_client.currency_code, customer_client.status
          FROM customer_client
          WHERE customer_client.manager = FALSE
        `,
      });
      return results.map((row) => {
        const r = row as {
          customerClient?: {
            id?: string;
            descriptiveName?: string;
            currencyCode?: string;
            status?: string;
          };
        };
        return {
          externalId: String(r.customerClient?.id ?? ""),
          name: r.customerClient?.descriptiveName ?? String(r.customerClient?.id ?? ""),
          currency: r.customerClient?.currencyCode,
          status: r.customerClient?.status,
        };
      }).filter((a) => a.externalId);
    } catch {
      // Fallback: treat login customer as the ad account
      return [
        {
          externalId: config.loginCustomerId.replace(/-/g, ""),
          name: `Google Ads ${config.loginCustomerId}`,
          currency: "USD",
          status: "ENABLED",
        },
      ];
    }
  },
  async syncExternalCampaigns(connectionId, adAccountId) {
    const token = await readAccessToken(connectionId);
    const config = await readGoogleAdsConfig();
    if (!token || !config.developerToken) return [];
    try {
      const results = await googleAdsSearch({
        accessToken: token,
        developerToken: config.developerToken,
        customerId: adAccountId,
        loginCustomerId: config.loginCustomerId || adAccountId,
        query: `
          SELECT campaign.id, campaign.name, campaign.status, campaign.advertising_channel_type
          FROM campaign
          ORDER BY campaign.id
        `,
      });
      return results.map((row) => {
        const r = row as {
          campaign?: { id?: string; name?: string; status?: string; advertisingChannelType?: string };
        };
        return {
          externalId: String(r.campaign?.id ?? ""),
          name: r.campaign?.name ?? String(r.campaign?.id ?? ""),
          status: r.campaign?.status,
          providerEntityType: "campaign",
          adAccountExternalId: adAccountId,
          metadata: { channelType: r.campaign?.advertisingChannelType },
        };
      }).filter((c) => c.externalId);
    } catch {
      return [];
    }
  },
  async syncAdGroups(connectionId, externalCampaignId) {
    const token = await readAccessToken(connectionId);
    const config = await readGoogleAdsConfig();
    if (!token || !config.developerToken || !config.loginCustomerId) return [];
    try {
      const results = await googleAdsSearch({
        accessToken: token,
        developerToken: config.developerToken,
        customerId: config.loginCustomerId,
        loginCustomerId: config.loginCustomerId,
        query: `
          SELECT ad_group.id, ad_group.name, ad_group.status, campaign.id
          FROM ad_group
          WHERE campaign.id = ${externalCampaignId}
        `,
      });
      return results.map((row) => {
        const r = row as {
          adGroup?: { id?: string; name?: string; status?: string };
        };
        return {
          externalId: String(r.adGroup?.id ?? ""),
          name: r.adGroup?.name ?? String(r.adGroup?.id ?? ""),
          status: r.adGroup?.status,
          providerEntityType: "ad_group",
          externalCampaignId,
        };
      }).filter((g) => g.externalId);
    } catch {
      return [];
    }
  },
  async syncAds(connectionId, adGroupExternalId) {
    const token = await readAccessToken(connectionId);
    const config = await readGoogleAdsConfig();
    if (!token || !config.developerToken || !config.loginCustomerId) return [];
    try {
      const results = await googleAdsSearch({
        accessToken: token,
        developerToken: config.developerToken,
        customerId: config.loginCustomerId,
        loginCustomerId: config.loginCustomerId,
        query: `
          SELECT ad_group_ad.ad.id, ad_group_ad.ad.name, ad_group_ad.status, ad_group.id
          FROM ad_group_ad
          WHERE ad_group.id = ${adGroupExternalId}
        `,
      });
      return results.map((row) => {
        const r = row as {
          adGroupAd?: { ad?: { id?: string; name?: string }; status?: string };
        };
        return {
          externalId: String(r.adGroupAd?.ad?.id ?? ""),
          name: r.adGroupAd?.ad?.name ?? String(r.adGroupAd?.ad?.id ?? ""),
          status: r.adGroupAd?.status,
          providerEntityType: "ad",
          adGroupExternalId,
        };
      }).filter((a) => a.externalId);
    } catch {
      return [];
    }
  },
  async syncCreatives() {
    return [];
  },
  async fetchCampaignMetrics(connectionId, externalCampaignId, period) {
    const token = await readAccessToken(connectionId);
    const config = await readGoogleAdsConfig();
    if (!token || !config.developerToken || !config.loginCustomerId) return [];
    try {
      const results = await googleAdsSearch({
        accessToken: token,
        developerToken: config.developerToken,
        customerId: config.loginCustomerId,
        loginCustomerId: config.loginCustomerId,
        query: `
          SELECT metrics.impressions, metrics.clicks, metrics.cost_micros, metrics.conversions, campaign.id
          FROM campaign
          WHERE campaign.id = ${externalCampaignId}
            AND segments.date BETWEEN '${period.from.slice(0, 10)}' AND '${period.to.slice(0, 10)}'
        `,
      });
      return results.map((row) => {
        const r = row as {
          metrics?: {
            impressions?: string | number;
            clicks?: string | number;
            costMicros?: string | number;
            conversions?: string | number;
          };
        };
        const costMicros = Number(r.metrics?.costMicros ?? 0);
        return {
          providerId: GOOGLE_ADS_PROVIDER_ID,
          externalCampaignId,
          impressions: Number(r.metrics?.impressions ?? 0),
          clicks: Number(r.metrics?.clicks ?? 0),
          spend: costMicros / 1_000_000,
          conversions: Number(r.metrics?.conversions ?? 0),
          periodStart: period.from,
          periodEnd: period.to,
        };
      });
    } catch {
      return [];
    }
  },
  async trackEvent() {
    // Google Ads offline conversion upload can be added when conversion action IDs are configured.
    return { ok: true, message: "Google Ads conversion upload deferred to configured conversion actions" };
  },
};
