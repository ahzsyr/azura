import type { ProviderManifest } from "@/modules/marketing/core/manifests/types";

export const LINKEDIN_PROVIDER_ID = "linkedin" as const;

export const linkedinProviderManifest: ProviderManifest = {
  id: LINKEDIN_PROVIDER_ID,
  displayName: "LinkedIn",
  icon: "Linkedin",
  documentationUrl: "https://learn.microsoft.com/en-us/linkedin/",
  capabilities: ["connection", "publishing", "analytics", "advertising", "tracking"],
  supportedAssets: ["company", "channel", "adAccount"],
  supportedMedia: ["image", "video", "document"],
  oauthConfig: {
    authorizeUrl: "https://www.linkedin.com/oauth/v2/authorization",
    tokenUrl: "https://www.linkedin.com/oauth/v2/accessToken",
    scopes: [
      "r_organization_social",
      "w_organization_social",
      "rw_organization_admin",
      "r_ads",
      "rw_ads",
    ],
    callbackPath: "/api/marketing/oauth/linkedin/callback",
  },
  featureFlags: {
    companyPages: true,
    advertising: true,
  },
  version: {
    apiVersion: "202401",
    sdkVersion: "1.0.0",
    minimumSupportedVersion: "202305",
    deprecatedAfter: null,
  },
  supportsScheduling: true,
  supportsInsights: true,
  supportsMessaging: false,
  healthChecks: ["connected", "tokenValid", "apiReachable", "rateLimited", "permissionsOk"],
};
