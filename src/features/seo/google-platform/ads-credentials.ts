import "server-only";
import { seoRepository } from "@/repositories/seo.repository";
import { refreshGoogleToken } from "@/features/seo/integrations/google-auth";
import { getGooglePlatformState, updateServiceConfiguration } from "./persistence";
import { createGoogleConnectionManager } from "./connection-manager";
import { parseGoogleAdsCustomerId } from "@/modules/marketing/providers/google-ads/sdk/api";

export const GOOGLE_ADS_SCOPE = "https://www.googleapis.com/auth/adwords";
export const GOOGLE_ADS_SEO_HREF = "/admin/seo/google?tab=ads";
export const GOOGLE_ADS_SEO_CONFIG_HREF = "/admin/seo/google?tab=ads#configuration";

export type GoogleAdsOperationalCredentials = {
  accessToken: string | null;
  hasRefreshToken: boolean;
  oauthConnected: boolean;
  hasAdwordsScope: boolean;
  clientId: string | null;
  hasClientSecret: boolean;
  developerToken: string | null;
  /** Validated MCC / login-customer-id from SEO Ads managerAccountId */
  loginCustomerId: string | null;
  /**
   * Login customer for Ads API calls: valid MCC, else configured customerId
   * (direct accounts without a manager).
   */
  effectiveLoginCustomerId: string | null;
  /** Validated Ads customer from SEO Ads customerId */
  customerId: string | null;
  /** Raw managerAccountId when present but invalid */
  invalidLoginCustomerIdRaw: string | null;
  /** Raw customerId when present but invalid */
  invalidCustomerIdRaw: string | null;
};

function readConfigString(cfg: Record<string, unknown>, key: string): string {
  const v = cfg[key];
  return typeof v === "string" ? v.trim() : "";
}

/**
 * Shared Google Ads credentials — SEO → Google is the source of truth.
 * Marketing sync/health/adapters must consume this resolver.
 */
export async function getGoogleAdsOperationalCredentials(): Promise<GoogleAdsOperationalCredentials> {
  const [platform, integrations] = await Promise.all([
    getGooglePlatformState(),
    seoRepository.getIntegrationsConfig(),
  ]);
  const google = integrations.google ?? {};
  const manager = createGoogleConnectionManager(platform);
  const oauthClient = manager.resolveOAuthClient({
    platform,
    legacyIntegrations: { google: google as never },
  });

  const clientId =
    oauthClient.clientId?.trim() ||
    (typeof google.clientId === "string" ? google.clientId.trim() : "") ||
    null;
  const clientSecret =
    oauthClient.clientSecret?.trim() ||
    (typeof google.clientSecret === "string" ? google.clientSecret.trim() : "") ||
    "";

  const adsService = platform.services.ads;
  const adsCfg = (adsService?.configuration ?? {}) as Record<string, unknown>;
  const granted = adsService?.connection?.grantedScopes ?? [];
  const hasAdwordsScope = granted.includes(GOOGLE_ADS_SCOPE);
  const adsConnectionConnected = adsService?.connection?.state === "connected";

  const rawManager = readConfigString(adsCfg, "managerAccountId");
  const rawCustomer = readConfigString(adsCfg, "customerId");
  const loginCustomerId = parseGoogleAdsCustomerId(rawManager);
  const customerId = parseGoogleAdsCustomerId(rawCustomer);

  let developerToken = readConfigString(adsCfg, "developerToken");
  if (developerToken.startsWith("has_")) {
    developerToken = "";
  }

  const hasRefreshToken = Boolean(
    typeof google.refreshToken === "string" && google.refreshToken.trim(),
  );
  const hasBearer = Boolean(
    typeof google.bearerToken === "string" && google.bearerToken.trim(),
  );

  let accessToken: string | null = null;
  if (clientId && clientSecret && (hasBearer || hasRefreshToken)) {
    try {
      const token = await refreshGoogleToken({
        ...google,
        clientId,
        clientSecret,
        bearerToken: google.bearerToken,
        refreshToken: google.refreshToken,
        tokenExpiresAt: google.tokenExpiresAt,
      });
      accessToken = token ?? null;
    } catch {
      accessToken = hasBearer ? String(google.bearerToken).trim() : null;
    }
  } else if (hasBearer) {
    accessToken = String(google.bearerToken).trim();
  }

  // Ads OAuth is connected when we have a token and Ads was connected (or adwords scope granted).
  // A bare GSC token without Ads Connect does not count as Ads OAuth.
  const oauthConnected = Boolean(
    accessToken && (hasAdwordsScope || adsConnectionConnected),
  );

  return {
    accessToken: oauthConnected ? accessToken : null,
    hasRefreshToken,
    oauthConnected,
    hasAdwordsScope: hasAdwordsScope || adsConnectionConnected,
    clientId,
    hasClientSecret: Boolean(clientSecret),
    developerToken: developerToken || null,
    loginCustomerId,
    effectiveLoginCustomerId: loginCustomerId || customerId,
    customerId,
    invalidLoginCustomerIdRaw: rawManager && !loginCustomerId ? rawManager : null,
    invalidCustomerIdRaw: rawCustomer && !customerId ? rawCustomer : null,
  };
}

/**
 * Persist validated Ads API fields onto SEO platform state (Marketing → SEO backfill).
 */
export async function writeSeoAdsApiFields(fields: {
  developerToken?: string | null;
  managerAccountId?: string | null;
  customerId?: string | null;
}): Promise<void> {
  const patch: Record<string, unknown> = {};
  if (fields.developerToken != null && String(fields.developerToken).trim()) {
    patch.developerToken = String(fields.developerToken).trim();
  }
  if (fields.managerAccountId != null) {
    const parsed = parseGoogleAdsCustomerId(fields.managerAccountId);
    if (parsed) patch.managerAccountId = parsed;
  }
  if (fields.customerId != null) {
    const parsed = parseGoogleAdsCustomerId(fields.customerId);
    if (parsed) patch.customerId = parsed;
  }
  if (Object.keys(patch).length === 0) return;
  await updateServiceConfiguration("ads", patch as import("./types").GoogleServiceConfigMap);
}
