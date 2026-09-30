import "server-only";
import { prisma } from "@/lib/prisma";
import { GOOGLE_ADS_PROVIDER_ID } from "@/modules/marketing/providers/google-ads/manifest";
import {
  getGoogleAdsOperationalCredentials,
  GOOGLE_ADS_SEO_HREF,
  GOOGLE_ADS_SEO_CONFIG_HREF,
} from "@/features/seo/google-platform/ads-credentials";
import { parseGoogleAdsCustomerId } from "@/modules/marketing/providers/google-ads/sdk/api";
import type {
  GoogleAdsHealthItem,
  GoogleAdsOperationalContext,
  GoogleAdsReadiness,
} from "./health-types";

export type {
  GoogleAdsHealthItem,
  GoogleAdsOperationalContext,
  GoogleAdsReadiness,
} from "./health-types";
export { deriveGoogleAdsReadiness } from "./readiness";

export const GOOGLE_ADS_PLATFORMS_HREF = "/admin/marketing/platforms?tab=google-ads";
/** @deprecated Prefer GOOGLE_ADS_SEO_CONFIG_HREF — Ads credentials live under SEO Google */
export const GOOGLE_ADS_CREDENTIALS_HREF = GOOGLE_ADS_SEO_CONFIG_HREF;
export const GOOGLE_ADS_AD_ACCOUNTS_HREF = "/admin/marketing/ad-accounts";
export const GOOGLE_ADS_CAMPAIGNS_HREF = "/admin/marketing/campaigns";

/** @deprecated Prefer GoogleAdsOperationalContext */
export type GoogleAdsOperationalHealth = {
  items: GoogleAdsHealthItem[];
  ok: boolean;
  summary: string;
};

/**
 * Ensure a MarketingConnection row exists as a projection of the SEO Google Ads connection.
 * Tokens are not stored here — the adapter reads SEO credentials.
 */
export async function ensureSeoBackedGoogleAdsConnection(): Promise<{
  id: string;
  status: string;
} | null> {
  const seo = await getGoogleAdsOperationalCredentials();
  if (!seo.oauthConnected) return null;

  const { ensureProviderRuntime } = await import(
    "@/modules/marketing/oauth/connection-lifecycle"
  );
  await ensureProviderRuntime(GOOGLE_ADS_PROVIDER_ID).catch(() => undefined);

  const connection = await prisma.marketingConnection.upsert({
    where: {
      providerId_tenantId: {
        providerId: GOOGLE_ADS_PROVIDER_ID,
        tenantId: "default",
      },
    },
    create: {
      providerId: GOOGLE_ADS_PROVIDER_ID,
      tenantId: "default",
      status: "connected",
      lifecycle: "connected",
      oauthMetadata: { source: "seo-google" } as object,
      scopesGranted: ["https://www.googleapis.com/auth/adwords"] as unknown as object,
      scopesRequired: ["https://www.googleapis.com/auth/adwords"] as unknown as object,
      scopesMissing: [] as unknown as object,
      scopesExpired: [] as unknown as object,
      lastHealthAt: new Date(),
    },
    update: {
      status: "connected",
      lifecycle: "connected",
      oauthMetadata: { source: "seo-google" } as object,
      lastHealthAt: new Date(),
    },
  });

  return { id: connection.id, status: connection.status };
}

/**
 * Shared Google Ads operational context. Credentials come from SEO → Google.
 */
export async function getGoogleAdsOperationalContext(
  connectionId?: string | null,
  options?: { legacySeoCustomerIdHint?: string | null },
): Promise<GoogleAdsOperationalContext> {
  const seo = await getGoogleAdsOperationalCredentials();

  let connection = connectionId
    ? await prisma.marketingConnection.findUnique({
        where: { id: connectionId },
        include: {
          credential: true,
          accounts: {
            where: { accountType: "google_ads_customer" },
            orderBy: [{ isSelected: "desc" }, { updatedAt: "desc" }],
          },
        },
      })
    : await prisma.marketingConnection.findFirst({
        where: { providerId: GOOGLE_ADS_PROVIDER_ID },
        include: {
          credential: true,
          accounts: {
            where: { accountType: "google_ads_customer" },
            orderBy: [{ isSelected: "desc" }, { updatedAt: "desc" }],
          },
        },
      });

  if (seo.oauthConnected && !connection) {
    const ensured = await ensureSeoBackedGoogleAdsConnection();
    if (ensured) {
      connection = await prisma.marketingConnection.findUnique({
        where: { id: ensured.id },
        include: {
          credential: true,
          accounts: {
            where: { accountType: "google_ads_customer" },
            orderBy: [{ isSelected: "desc" }, { updatedAt: "desc" }],
          },
        },
      });
    }
  }

  const developerToken = seo.developerToken ?? "";
  const loginCustomerId = seo.effectiveLoginCustomerId;
  const hasAccessToken = Boolean(seo.accessToken);
  const oauthOk = seo.oauthConnected;

  const selected =
    connection?.accounts.find((a: { isSelected: boolean }) => a.isSelected) ??
    connection?.accounts[0];
  const inventoryCustomerId = parseGoogleAdsCustomerId(selected?.externalAccountId);
  const customerId = inventoryCustomerId || seo.customerId;
  const accountCount = connection?.accounts.length ?? 0;

  let apiOk = false;
  let apiMessage = "Not probed";
  let lastVerifiedAt: string | null = null;
  if (hasAccessToken && developerToken && loginCustomerId && customerId) {
    try {
      const { googleAdsProbeCustomer } = await import(
        "@/modules/marketing/providers/google-ads/sdk/api"
      );
      const probe = await googleAdsProbeCustomer({
        accessToken: seo.accessToken!,
        developerToken,
        customerId,
        loginCustomerId,
      });
      apiOk = probe.ok;
      apiMessage = probe.ok
        ? `Customer ${probe.customerId ?? customerId} reachable`
        : probe.message ?? "Probe failed";
      if (probe.ok) lastVerifiedAt = new Date().toISOString();
    } catch (error) {
      apiMessage = error instanceof Error ? error.message : String(error);
    }
  } else if (!customerId) {
    apiMessage = "No Google Ads customer configured or selected";
  } else if (seo.invalidLoginCustomerIdRaw && !seo.loginCustomerId && !seo.customerId) {
    apiMessage = `Invalid MCC "${seo.invalidLoginCustomerIdRaw}" — use a numeric manager ID`;
  }

  const bindings = await prisma.marketingCampaignProviderBinding.findMany({
    where: { providerId: GOOGLE_ADS_PROVIDER_ID, status: "linked" },
    select: {
      syncStatus: true,
      lastSyncAt: true,
      lastSyncError: true,
      lastMetricsSyncAt: true,
    },
  });
  const syncErrors = bindings.filter(
    (b: { syncStatus: string | null; lastSyncError: string | null }) =>
      b.syncStatus === "error" || Boolean(b.lastSyncError),
  );
  const campaignSyncOk =
    Boolean(selected?.lastSyncAt) && (bindings.length === 0 || syncErrors.length === 0);
  const metricsSynced = bindings.filter(
    (b: { lastMetricsSyncAt: Date | null }) => Boolean(b.lastMetricsSyncAt),
  );
  const metricsSyncOk =
    bindings.length === 0
      ? Boolean(selected || seo.customerId)
      : metricsSynced.length > 0 && syncErrors.length === 0;

  const adsAccountConfigured = Boolean(customerId);
  const loginCustomerOk = Boolean(loginCustomerId);

  const healthChecks: GoogleAdsHealthItem[] = [
    {
      id: "oauth_token",
      label: "OAuth token",
      ok: oauthOk,
      message: !oauthOk
        ? "Not connected — Connect under SEO → Google → Ads"
        : "Token present (SEO Google)",
      href: GOOGLE_ADS_SEO_HREF,
      actionLabel: oauthOk ? "Reconnect" : "Connect",
    },
    {
      id: "developer_token",
      label: "Developer token",
      ok: Boolean(developerToken),
      message: developerToken ? "Configured" : "Missing developer token",
      href: GOOGLE_ADS_SEO_CONFIG_HREF,
      actionLabel: "Configure",
    },
    {
      id: "login_customer",
      label: "Login customer (MCC)",
      ok: loginCustomerOk,
      message: seo.loginCustomerId
        ? `MCC ${seo.loginCustomerId}`
        : loginCustomerId
          ? seo.invalidLoginCustomerIdRaw
            ? `Using customer ${loginCustomerId} as login (replace invalid MCC "${seo.invalidLoginCustomerIdRaw}")`
            : `Using customer ${loginCustomerId} as login`
          : seo.invalidLoginCustomerIdRaw
            ? `Invalid MCC "${seo.invalidLoginCustomerIdRaw}" — numeric ID required`
            : "Missing login customer ID",
      href: GOOGLE_ADS_SEO_CONFIG_HREF,
      actionLabel: "Configure",
    },
    {
      id: "ads_account",
      label: "Ads account",
      ok: adsAccountConfigured,
      message: customerId
        ? hasAccessToken && developerToken && loginCustomerOk
          ? apiOk
            ? apiMessage
            : `${customerId}: ${apiMessage}`
          : `Configured ${customerId}`
        : accountCount === 0
          ? "Configure customer ID under SEO → Google → Ads, then Sync Ad Accounts"
          : "Select a Google Ads customer",
      href: adsAccountConfigured ? GOOGLE_ADS_AD_ACCOUNTS_HREF : GOOGLE_ADS_SEO_CONFIG_HREF,
      actionLabel: adsAccountConfigured ? "Open Ad Accounts" : "Configure",
    },
    {
      id: "campaign_sync",
      label: "Campaign sync",
      ok: campaignSyncOk,
      message: !selected?.lastSyncAt
        ? accountCount === 0
          ? "Inventory not synced yet — Sync Ad Accounts"
          : "Inventory not synced yet"
        : syncErrors.length
          ? `${syncErrors.length} binding sync error(s)`
          : `Last sync ${selected.lastSyncAt.toISOString()}`,
      href: GOOGLE_ADS_AD_ACCOUNTS_HREF,
      actionLabel: "Sync accounts",
    },
    {
      id: "metrics_sync",
      label: "Metrics sync",
      ok: metricsSyncOk,
      message:
        bindings.length === 0
          ? "No linked bindings yet"
          : metricsSynced.length === 0
            ? "No metrics sync yet"
            : `${metricsSynced.length}/${bindings.length} bindings have metrics`,
      href: GOOGLE_ADS_CAMPAIGNS_HREF,
      actionLabel: "Open Campaigns",
    },
  ];

  if (adsAccountConfigured && hasAccessToken && developerToken && loginCustomerOk) {
    healthChecks[3]!.ok = apiOk;
  }

  const hasDeveloperToken = Boolean(developerToken);
  const hasLoginCustomerId = loginCustomerOk;
  const operational =
    oauthOk && hasDeveloperToken && hasLoginCustomerId && adsAccountConfigured;

  let readiness: GoogleAdsReadiness = "not_connected";
  if (operational) readiness = "operational";
  else if (oauthOk) readiness = "setup_incomplete";

  const failed = healthChecks.filter((i) => !i.ok);
  const ok =
    operational &&
    failed.filter((i) => i.id !== "campaign_sync" && i.id !== "metrics_sync").length === 0;
  const summary =
    readiness === "operational"
      ? failed.length === 0
        ? "Google Ads operational"
        : `Operational — ${failed.map((i) => i.id).join(", ")} need attention`
      : readiness === "setup_incomplete"
        ? `Setup incomplete: ${failed.map((i) => i.id).join(", ") || "finish configuration"}`
        : "Not connected — configure under SEO → Google → Ads";

  const legacyHint =
    options?.legacySeoCustomerIdHint ??
    (accountCount === 0 && seo.customerId ? seo.customerId : null);

  return {
    oauthConnected: oauthOk,
    operational,
    readiness,
    hasAccessToken,
    hasDeveloperToken,
    hasLoginCustomerId,
    accountCount,
    selectedCustomerId: customerId,
    loginCustomerId,
    lastVerifiedAt,
    connectionId: connection?.id ?? null,
    connectionStatus: connection?.status ?? (oauthOk ? "connected" : null),
    healthChecks,
    legacySeoCustomerIdHint: legacyHint,
    ok,
    summary,
  };
}

/** Back-compat wrapper used by Platforms page. */
export async function getGoogleAdsOperationalHealth(
  connectionId?: string | null,
): Promise<
  GoogleAdsOperationalHealth &
    Pick<
      GoogleAdsOperationalContext,
      | "readiness"
      | "oauthConnected"
      | "operational"
      | "selectedCustomerId"
      | "legacySeoCustomerIdHint"
    >
> {
  const ctx = await getGoogleAdsOperationalContext(connectionId);
  return {
    items: ctx.healthChecks,
    ok: ctx.ok,
    summary: ctx.summary,
    readiness: ctx.readiness,
    oauthConnected: ctx.oauthConnected,
    operational: ctx.operational,
    selectedCustomerId: ctx.selectedCustomerId,
    legacySeoCustomerIdHint: ctx.legacySeoCustomerIdHint,
  };
}
