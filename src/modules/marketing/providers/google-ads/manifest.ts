import type { ProviderManifest } from "@/modules/marketing/core/manifests/types";

export const GOOGLE_ADS_PROVIDER_ID = "google-ads" as const;

export const googleAdsProviderManifest: ProviderManifest = {
  id: GOOGLE_ADS_PROVIDER_ID,
  displayName: "Google Ads",
  icon: "Chrome",
  documentationUrl: "https://developers.google.com/google-ads/api/docs/start",
  capabilities: ["connection", "analytics", "tracking", "advertising"],
  supportedAssets: ["adAccount", "pixel", "channel"],
  supportedMedia: ["image", "video"],
  oauthConfig: {
    authorizeUrl: "https://accounts.google.com/o/oauth2/v2/auth",
    tokenUrl: "https://oauth2.googleapis.com/token",
    scopes: ["https://www.googleapis.com/auth/adwords"],
    callbackPath: "/api/marketing/oauth/google-ads/callback",
  },
  featureFlags: {
    gaql: true,
    conversions: true,
  },
  version: {
    apiVersion: "v25",
    sdkVersion: "1.0.0",
    minimumSupportedVersion: "v22",
    deprecatedAfter: null,
  },
  supportsScheduling: false,
  supportsInsights: true,
  supportsMessaging: false,
  healthChecks: ["connected", "tokenValid", "apiReachable", "rateLimited", "permissionsOk"],
};
