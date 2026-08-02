import type { ProviderManifest } from "@/modules/marketing/core/manifests/types";

export const META_PROVIDER_ID = "meta" as const;

export const metaProviderManifest: ProviderManifest = {
  id: META_PROVIDER_ID,
  displayName: "Meta",
  icon: "Facebook",
  documentationUrl: "https://developers.facebook.com/docs/marketing-api",
  capabilities: ["connection", "publishing", "analytics", "tracking", "leadSync", "messaging", "advertising"],
  supportedAssets: ["page", "businessProfile", "adAccount", "leadForm", "pixel", "catalogue"],
  supportedMedia: ["image", "video", "carousel", "reel"],
  oauthConfig: {
    authorizeUrl: "https://www.facebook.com/v21.0/dialog/oauth",
    tokenUrl: "https://graph.facebook.com/v21.0/oauth/access_token",
    scopes: [
      "pages_show_list",
      "pages_read_engagement",
      "pages_manage_posts",
      "instagram_basic",
      "instagram_content_publish",
      "leads_retrieval",
      "business_management",
    ],
    callbackPath: "/api/marketing/oauth/meta/callback",
  },
  featureFlags: {
    pixel: true,
    capi: true,
    leadForms: true,
  },
  version: {
    apiVersion: "v21.0",
    sdkVersion: "1.0.0",
    minimumSupportedVersion: "v19.0",
    deprecatedAfter: null,
  },
  supportsScheduling: true,
  supportsInsights: true,
  supportsMessaging: true,
  healthChecks: [
    "connected",
    "tokenValid",
    "apiReachable",
    "rateLimited",
    "permissionsOk",
    "webhookOk",
    "pixelVerified",
  ],
};
