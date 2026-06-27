import type { PublicSeoIntegrationProviderConfig, SeoIntegrationProviderConfig } from "@/features/seo/types";

type GoogleConfigLike = PublicSeoIntegrationProviderConfig | SeoIntegrationProviderConfig;

function hasBearer(config?: GoogleConfigLike): boolean {
  if (!config) return false;
  if ("hasBearerToken" in config && config.hasBearerToken) return true;
  if ("bearerToken" in config) return Boolean(config.bearerToken?.trim());
  return false;
}

export function truncateClientId(clientId?: string): string | null {
  const value = clientId?.trim();
  if (!value) return null;
  if (value.length <= 24) return value;
  return `${value.slice(0, 14)}…${value.slice(-6)}`;
}

export function normalizeGa4PropertyId(propertyId?: string): string | undefined {
  const value = propertyId?.trim();
  if (!value) return undefined;
  return value.replace(/^properties\//, "");
}

export function isGscSitemapReady(config?: GoogleConfigLike): boolean {
  return Boolean(config?.enabled && config.siteUrl?.trim() && hasBearer(config));
}

export function isGscSearchAnalyticsReady(config?: GoogleConfigLike): boolean {
  return Boolean(config?.analyticsEnabled && hasBearer(config) && config.siteUrl?.trim());
}

export function isGa4AnalyticsReady(config?: GoogleConfigLike): boolean {
  return Boolean(
    config?.analyticsEnabled && hasBearer(config) && normalizeGa4PropertyId(config.ga4PropertyId),
  );
}

export function getGoogleSetupSteps(
  config: PublicSeoIntegrationProviderConfig,
  canStartGoogleOAuth: boolean,
): string[] {
  const steps: string[] = [];

  if (!config.clientId?.trim()) {
    steps.push("Enter OAuth client ID and save.");
  }
  if (!config.hasClientSecret) {
    steps.push("Enter OAuth client secret and save.");
  }
  if (!config.hasBearerToken) {
    steps.push(
      canStartGoogleOAuth
        ? "Click Connect Google (Search Console & Analytics) and complete OAuth."
        : "Save OAuth client ID and secret, then connect Google.",
    );
  }
  if (!config.siteUrl?.trim()) {
    steps.push("Set Site URL to match your Search Console property exactly.");
  }
  if (config.analyticsEnabled && !normalizeGa4PropertyId(config.ga4PropertyId)) {
    steps.push("Set GA4 property ID for website analytics (Admin → Property settings).");
  }
  if (config.enabled && config.hasBearerToken && config.siteUrl?.trim()) {
    steps.push("Submit sitemap from the Queue & jobs tab.");
  }

  return steps;
}

export function buildGoogleRecordedSummary(
  config: PublicSeoIntegrationProviderConfig,
  sitemapUrl: string,
) {
  return {
    enabled: Boolean(config.enabled),
    analyticsEnabled: Boolean(config.analyticsEnabled),
    siteUrl: config.siteUrl?.trim() || null,
    sitemapUrl,
    clientId: truncateClientId(config.clientId),
    ga4PropertyId: normalizeGa4PropertyId(config.ga4PropertyId) ?? null,
    hasBearerToken: Boolean(config.hasBearerToken),
    hasClientSecret: Boolean(config.hasClientSecret),
    hasRefreshToken: Boolean(config.hasRefreshToken),
    gscSitemapReady: isGscSitemapReady(config),
    gscSearchAnalyticsReady: isGscSearchAnalyticsReady(config),
    ga4AnalyticsReady: isGa4AnalyticsReady(config),
  };
}

export function googleHealthMessage(config?: GoogleConfigLike): string {
  if (!config?.enabled) return "Disabled";

  const missing: string[] = [];
  if (!config.siteUrl?.trim()) missing.push("GSC site URL");
  if (!hasBearer(config)) missing.push("OAuth bearer token");

  if (missing.length > 0) {
    return `Setup needed: ${missing.join(", ")}`;
  }

  const parts: string[] = [];
  if (isGscSitemapReady(config)) parts.push("GSC sitemap ready");
  if (isGscSearchAnalyticsReady(config)) parts.push("GSC search analytics ready");
  if (config.analyticsEnabled && !isGa4AnalyticsReady(config)) {
    parts.push("GA4 property ID needed");
  } else if (isGa4AnalyticsReady(config)) {
    parts.push("GA4 ready");
  }

  return parts.length > 0 ? parts.join(" · ") : "Missing credentials or site URL";
}
