import type { MarketingProviderAdapter } from "@/modules/marketing/core/registry/types";
import { buildHealthReport, checkNow } from "@/modules/marketing/core/health";
import { GOOGLE_ADS_PROVIDER_ID, googleAdsProviderManifest } from "../manifest";
import {
  googleAdsProbeCustomer,
  googleAdsSearch,
  normalizeGoogleAdsCustomerId,
  uploadGoogleAdsOfflineConversion,
} from "../sdk/api";

async function readAccessToken(_connectionId: string) {
  const { getGoogleAdsOperationalCredentials } = await import(
    "@/features/seo/google-platform/ads-credentials"
  );
  const seo = await getGoogleAdsOperationalCredentials();
  return seo.accessToken ?? undefined;
}

async function readGoogleAdsConfig() {
  const { getGoogleAdsOperationalCredentials } = await import(
    "@/features/seo/google-platform/ads-credentials"
  );
  const seo = await getGoogleAdsOperationalCredentials();
  const loginCustomerId = seo.effectiveLoginCustomerId ?? "";
  if (!loginCustomerId) {
    if (seo.invalidLoginCustomerIdRaw) {
      throw new Error(
        `Invalid Google Ads MCC "${seo.invalidLoginCustomerIdRaw}" — use a numeric manager ID, or set Ads Customer ID`,
      );
    }
    throw new Error(
      "Missing Google Ads login customer — set Manager Account (MCC) or Customer ID under SEO → Google → Ads",
    );
  }
  return {
    clientId: seo.clientId ?? "",
    clientSecret: seo.hasClientSecret ? "(seo)" : "",
    developerToken: seo.developerToken ?? "",
    loginCustomerId,
    customerId: seo.customerId ?? "",
    usedCustomerAsLogin: Boolean(!seo.loginCustomerId && seo.customerId),
  };
}

async function readGoogleAdsConfigSafe() {
  try {
    return await readGoogleAdsConfig();
  } catch {
    return null;
  }
}

/** Resolve customerId for a campaign-scoped call (selected Ads customer, not MCC). */
function resolveCustomerId(
  selectedCustomerId: string | undefined,
  loginCustomerId: string,
): string {
  return normalizeGoogleAdsCustomerId(selectedCustomerId) || loginCustomerId;
}

export const googleAdsProviderAdapter: MarketingProviderAdapter = {
  id: GOOGLE_ADS_PROVIDER_ID,
  manifest: googleAdsProviderManifest,
  capabilities() {
    return googleAdsProviderManifest.capabilities;
  },
  async health(connectionId) {
    const token = await readAccessToken(connectionId);
    let config: Awaited<ReturnType<typeof readGoogleAdsConfig>> | null = null;
    let configError: string | null = null;
    try {
      config = await readGoogleAdsConfig();
    } catch (error) {
      configError = error instanceof Error ? error.message : String(error);
    }
    const operational = Boolean(
      config?.developerToken && config?.loginCustomerId,
    );

    const { prisma } = await import("@/lib/prisma");
    const selectedAccount = await prisma.marketingAccount.findFirst({
      where: { connectionId, accountType: "google_ads_customer" },
      orderBy: { updatedAt: "desc" },
    });
    const { getGoogleAdsOperationalCredentials } = await import(
      "@/features/seo/google-platform/ads-credentials"
    );
    const seo = await getGoogleAdsOperationalCredentials();
    const customerId =
      normalizeGoogleAdsCustomerId(selectedAccount?.externalAccountId) ||
      seo.customerId ||
      "";

    let apiReachable = false;
    let apiMessage = configError
      ? configError
      : customerId
        ? "Not probed"
        : "No Ads customer selected";
    if (token && operational && customerId && config) {
      const probe = await googleAdsProbeCustomer({
        accessToken: token,
        developerToken: config.developerToken,
        customerId,
        loginCustomerId: config.loginCustomerId,
      });
      apiReachable = probe.ok;
      apiMessage = probe.ok
        ? `Customer ${probe.customerId ?? customerId} reachable`
        : probe.message ?? "Probe failed";
    }

    const { getGoogleAdsOperationalHealth } = await import("../health");
    const ops = await getGoogleAdsOperationalHealth(connectionId);

    return buildHealthReport({
      providerId: GOOGLE_ADS_PROVIDER_ID,
      connectionId,
      checks: [
        checkNow("connected", Boolean(token), token ? "Connected via SEO Google" : "Missing token"),
        checkNow(
          "tokenValid",
          Boolean(token) && ops.items.find((i) => i.id === "oauth_token")?.ok !== false,
          token ? "Token present" : "No access token",
        ),
        checkNow("apiReachable", apiReachable, apiMessage),
        checkNow("rateLimited", true),
        checkNow(
          "permissionsOk",
          operational && Boolean(customerId) && !configError,
          configError
            ? configError
            : operational
              ? customerId
                ? "Developer token + MCC + Ads customer ready"
                : "Select a Google Ads customer"
              : "Developer token or login customer ID missing under SEO → Google → Ads",
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
    let config: Awaited<ReturnType<typeof readGoogleAdsConfig>>;
    try {
      config = await readGoogleAdsConfig();
    } catch (error) {
      throw error instanceof Error
        ? error
        : new Error("Google Ads credentials are incomplete");
    }
    if (!token) {
      throw new Error("Google Ads OAuth token missing — Connect under SEO → Google → Ads");
    }
    if (!config.developerToken) {
      throw new Error("Developer token missing under SEO → Google → Ads → Configuration");
    }
    if (!config.loginCustomerId) {
      throw new Error("Numeric MCC or Customer ID required under SEO → Google → Ads");
    }

    const seedConfiguredCustomer = () =>
      config.customerId
        ? [
            {
              externalId: config.customerId,
              name: `Google Ads ${config.customerId}`,
              currency: undefined as string | undefined,
              status: "ENABLED",
            },
          ]
        : [];

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
      const mapped = results
        .map((row) => {
          const r = row as {
            customerClient?: {
              id?: string;
              descriptiveName?: string;
              currencyCode?: string;
              status?: string;
            };
          };
          return {
            externalId: normalizeGoogleAdsCustomerId(String(r.customerClient?.id ?? "")),
            name: r.customerClient?.descriptiveName ?? String(r.customerClient?.id ?? ""),
            currency: r.customerClient?.currencyCode,
            status: r.customerClient?.status,
          };
        })
        .filter((a) => a.externalId);

      if (mapped.length > 0) return mapped;

      // Direct (non-MCC) account: customer_client is empty — seed configured customer
      const seeded = seedConfiguredCustomer();
      if (seeded.length > 0) return seeded;

      return [
        {
          externalId: config.loginCustomerId,
          name: `Google Ads ${config.loginCustomerId}`,
          currency: undefined,
          status: "ENABLED",
        },
      ];
    } catch (error) {
      const seeded = seedConfiguredCustomer();
      if (seeded.length > 0) return seeded;
      throw error instanceof Error
        ? error
        : new Error("Google Ads account list failed");
    }
  },
  async syncExternalCampaigns(connectionId, adAccountId) {
    const token = await readAccessToken(connectionId);
    const config = await readGoogleAdsConfigSafe();
    if (!token || !config?.developerToken) return [];
    const customerId = resolveCustomerId(adAccountId, config.loginCustomerId);
    try {
      const results = await googleAdsSearch({
        accessToken: token,
        developerToken: config.developerToken,
        customerId,
        loginCustomerId: config.loginCustomerId || customerId,
        query: `
          SELECT campaign.id, campaign.name, campaign.status, campaign.advertising_channel_type,
                 campaign.advertising_channel_sub_type
          FROM campaign
          ORDER BY campaign.id
        `,
      });
      return results
        .map((row) => {
          const r = row as {
            campaign?: {
              id?: string;
              name?: string;
              status?: string;
              advertisingChannelType?: string;
              advertisingChannelSubType?: string;
            };
          };
          return {
            externalId: String(r.campaign?.id ?? ""),
            name: r.campaign?.name ?? String(r.campaign?.id ?? ""),
            status: r.campaign?.status,
            providerEntityType: "campaign",
            adAccountExternalId: customerId,
            metadata: {
              channelType: r.campaign?.advertisingChannelType,
              channelSubType: r.campaign?.advertisingChannelSubType,
            },
          };
        })
        .filter((c) => c.externalId);
    } catch {
      return [];
    }
  },
  async syncAdGroups(connectionId, externalCampaignId, options) {
    const token = await readAccessToken(connectionId);
    const config = await readGoogleAdsConfigSafe();
    if (!token || !config?.developerToken) return [];
    const customerId = resolveCustomerId(
      options?.customerId as string | undefined,
      config.loginCustomerId,
    );
    if (!customerId) return [];
    try {
      const results = await googleAdsSearch({
        accessToken: token,
        developerToken: config.developerToken,
        customerId,
        loginCustomerId: config.loginCustomerId || customerId,
        query: `
          SELECT ad_group.id, ad_group.name, ad_group.status, campaign.id
          FROM ad_group
          WHERE campaign.id = ${externalCampaignId}
        `,
      });
      return results
        .map((row) => {
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
        })
        .filter((g) => g.externalId);
    } catch {
      return [];
    }
  },
  async syncAds(connectionId, adGroupExternalId, options) {
    const token = await readAccessToken(connectionId);
    const config = await readGoogleAdsConfigSafe();
    if (!token || !config?.developerToken) return [];
    const customerId = resolveCustomerId(
      options?.customerId as string | undefined,
      config.loginCustomerId,
    );
    if (!customerId) return [];
    try {
      const results = await googleAdsSearch({
        accessToken: token,
        developerToken: config.developerToken,
        customerId,
        loginCustomerId: config.loginCustomerId || customerId,
        query: `
          SELECT ad_group_ad.ad.id, ad_group_ad.ad.name, ad_group_ad.status, ad_group.id
          FROM ad_group_ad
          WHERE ad_group.id = ${adGroupExternalId}
        `,
      });
      return results
        .map((row) => {
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
        })
        .filter((a) => a.externalId);
    } catch {
      return [];
    }
  },
  async syncCreatives() {
    return [];
  },
  async fetchCampaignMetrics(connectionId, externalCampaignId, period, options) {
    const token = await readAccessToken(connectionId);
    const config = await readGoogleAdsConfigSafe();
    if (!token || !config?.developerToken) return [];
    const customerId = resolveCustomerId(
      options?.customerId as string | undefined,
      config.loginCustomerId,
    );
    if (!customerId) return [];
    try {
      const results = await googleAdsSearch({
        accessToken: token,
        developerToken: config.developerToken,
        customerId,
        loginCustomerId: config.loginCustomerId || customerId,
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
        const impressions = Number(r.metrics?.impressions ?? 0);
        const clicks = Number(r.metrics?.clicks ?? 0);
        const spend = costMicros / 1_000_000;
        return {
          providerId: GOOGLE_ADS_PROVIDER_ID,
          externalCampaignId,
          accountId: customerId,
          impressions,
          clicks,
          spend,
          conversions: Number(r.metrics?.conversions ?? 0),
          ctr: impressions > 0 ? clicks / impressions : 0,
          cpc: clicks > 0 ? spend / clicks : 0,
          periodStart: period.from,
          periodEnd: period.to,
        };
      });
    } catch {
      return [];
    }
  },
  async trackEvent(event) {
    const conversionAction =
      typeof event.properties?.conversionActionResourceName === "string"
        ? event.properties.conversionActionResourceName
        : typeof event.properties?.googleConversionActionId === "string"
          ? event.properties.googleConversionActionId
          : null;
    const gclid =
      typeof event.properties?.gclid === "string" ? event.properties.gclid : null;
    const connectionId =
      typeof event.properties?.connectionId === "string" ? event.properties.connectionId : null;
    const customerId =
      typeof event.properties?.customerId === "string" ? event.properties.customerId : null;

    const allowed = new Set([
      "LeadGenerated",
      "FormSubmitted",
      "Purchase",
      "QualifiedLead",
    ]);
    if (!allowed.has(event.name)) {
      return { ok: true, message: `Skipped non-conversion event ${event.name}` };
    }
    if (!conversionAction || !gclid || !connectionId || !customerId) {
      return {
        ok: true,
        message: "Google Ads conversion upload deferred — missing action, gclid, or customer",
      };
    }

    const token = await readAccessToken(connectionId);
    const config = await readGoogleAdsConfigSafe();
    if (!token || !config?.developerToken) {
      return { ok: false, message: "Google Ads not configured for conversion upload" };
    }

    const resourceName = conversionAction.includes("/")
      ? conversionAction
      : `customers/${normalizeGoogleAdsCustomerId(customerId)}/conversionActions/${conversionAction}`;

    return uploadGoogleAdsOfflineConversion({
      accessToken: token,
      developerToken: config.developerToken,
      customerId,
      loginCustomerId: config.loginCustomerId || customerId,
      conversionActionResourceName: resourceName,
      gclid,
      conversionDateTime: event.occurredAt.replace("T", " ").replace(/\.\d{3}Z$/, "+00:00"),
      conversionValue: event.value,
      currencyCode: event.currency,
    });
  },
};
