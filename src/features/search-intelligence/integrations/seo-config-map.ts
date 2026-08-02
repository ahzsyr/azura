import type { ConnectorState } from "../types";
import type { ConnectorId, ConnectorRuntime } from "./index";
import {
  isGtagSiteTrackingConfigured,
  isGtmSiteTrackingConfigured,
  normalizeMeasurementId,
  normalizeGtmContainerId,
} from "@/features/seo/tracking/resolve-tracking";
import type {
  PublicSeoIntegrationProviderConfig,
  SeoIntegrationsConfig,
  SeoTrackingConfig,
} from "@/features/seo/types";
import type { GooglePlatformState, GoogleIntegrationId } from "@/features/seo/google-platform/types";
import { emptyPlatformState } from "@/features/seo/google-platform/types";
import { buildContext } from "@/features/seo/google-platform/monitoring";
import { googleIntegrationRegistry } from "@/features/seo/google-platform/registry";

export type ConnectorConfigSnapshot = {
  id: ConnectorId;
  state: ConnectorState;
  message: string;
  configureHref: string;
  testable: boolean;
  healthScore?: number;
  quotaCurrent?: number;
  quotaMaximum?: number;
  pendingJobs?: number;
  warnings?: number;
  errors?: number;
  lastSyncAt?: string | null;
  metrics?: Record<string, number | string>;
};

type GoogleConfigLike = PublicSeoIntegrationProviderConfig | NonNullable<SeoIntegrationsConfig["google"]>;

function hasBearer(config?: GoogleConfigLike): boolean {
  if (!config) return false;
  if ("hasBearerToken" in config && config.hasBearerToken) return true;
  if ("bearerToken" in config) return Boolean(config.bearerToken?.trim());
  if ("refreshToken" in config) return Boolean(config.refreshToken?.trim());
  return false;
}

function normalizeGa4PropertyId(propertyId?: string): string | undefined {
  const value = propertyId?.trim();
  if (!value) return undefined;
  return value.replace(/^properties\//, "");
}

function isGscSitemapReady(config?: GoogleConfigLike): boolean {
  return Boolean(config?.enabled && config.siteUrl?.trim() && hasBearer(config));
}

function isGscSearchAnalyticsReady(config?: GoogleConfigLike): boolean {
  return Boolean(config?.analyticsEnabled && hasBearer(config) && config.siteUrl?.trim());
}

function isGa4AnalyticsReady(config?: GoogleConfigLike): boolean {
  return Boolean(config?.analyticsEnabled && hasBearer(config) && normalizeGa4PropertyId(config.ga4PropertyId));
}

function googleHealthMessage(config?: GoogleConfigLike): string {
  if (!config?.enabled) return "Disabled";
  const missing: string[] = [];
  if (!config.siteUrl?.trim()) missing.push("GSC site URL");
  if (!hasBearer(config)) missing.push("OAuth bearer token");
  if (missing.length > 0) return `Setup needed: ${missing.join(", ")}`;

  const parts: string[] = [];
  if (isGscSitemapReady(config)) parts.push("GSC sitemap configured");
  if (isGscSearchAnalyticsReady(config)) parts.push("GSC search analytics configured");
  if (config.analyticsEnabled && !isGa4AnalyticsReady(config)) {
    parts.push("GA4 property ID needed");
  } else if (isGa4AnalyticsReady(config)) {
    parts.push("GA4 configured");
  }
  return parts.length > 0 ? parts.join(" · ") : "Missing credentials or site URL";
}

function runtime(
  id: ConnectorId,
  state: ConnectorState,
  message: string,
  configureHref: string,
  testable: boolean,
  extra?: Partial<ConnectorConfigSnapshot>,
): ConnectorConfigSnapshot {
  return { id, state, message, configureHref, testable, ...extra };
}

function googlePublicLike(
  google?: SeoIntegrationsConfig["google"],
): PublicSeoIntegrationProviderConfig | undefined {
  if (!google) return undefined;
  return {
    ...google,
    hasBearerToken: Boolean(google.bearerToken?.trim() || google.refreshToken?.trim()),
    hasRefreshToken: Boolean(google.refreshToken?.trim()),
    hasClientSecret: Boolean(google.clientSecret?.trim()),
    hasServiceAccountJson: Boolean(google.serviceAccountJson?.trim()),
    hasApiKey: Boolean(google.apiKey?.trim()),
  };
}

function isBingConfigured(config?: SeoIntegrationsConfig["bing"]): boolean {
  return Boolean(config?.enabled && config.apiKey?.trim() && config.siteUrl?.trim());
}

function isIndexNowConfigured(config?: SeoIntegrationsConfig["indexnow"]): boolean {
  return Boolean(config?.enabled && config.apiKey?.trim());
}

function connectorIdForIntegration(id: GoogleIntegrationId): ConnectorId | null {
  const map: Partial<Record<GoogleIntegrationId, ConnectorId>> = {
    search_console: "search_console",
    analytics: "analytics",
    merchant_center: "merchant_center",
    business_profile: "business_profile",
    pagespeed: "pagespeed",
    indexing_api: "indexing_api",
    ads: "ads",
    indexnow: "indexnow",
  };
  return map[id] ?? null;
}

/**
 * Map durable SEO admin config + Google platform state into Search Operations connector health.
 */
export function mapSeoConfigToConnectorSnapshots(input: {
  tracking: SeoTrackingConfig;
  integrations: SeoIntegrationsConfig;
  envGaId?: string;
  platform?: GooglePlatformState;
}): ConnectorConfigSnapshot[] {
  const google = input.integrations.google;
  const googlePublic = googlePublicLike(google);
  const googleHref = "/admin/seo/google";
  const integrationsHref = "/admin/seo/integrations";
  const platform = input.platform ?? emptyPlatformState();

  const ctx = buildContext({
    platform,
    legacyIntegrations: input.integrations as never,
    tracking: input.tracking as never,
    env: { gaId: input.envGaId },
  });

  const gscReady = isGscSitemapReady(googlePublic);
  const ga4ApiReady = isGa4AnalyticsReady(googlePublic);
  const gscAnalyticsReady = isGscSearchAnalyticsReady(googlePublic);
  const gtagReady =
    isGtagSiteTrackingConfigured(input.tracking) ||
    Boolean(
      input.envGaId &&
        normalizeMeasurementId(input.envGaId) &&
        input.tracking.enabled !== false &&
        !isGtmSiteTrackingConfigured(input.tracking),
    );
  const gtmReady = isGtmSiteTrackingConfigured(input.tracking);
  const measurementId =
    (input.tracking.measurementId
      ? normalizeMeasurementId(input.tracking.measurementId)
      : undefined) ??
    (input.envGaId ? normalizeMeasurementId(input.envGaId) : undefined);
  const gtmId = input.tracking.gtmContainerId
    ? normalizeGtmContainerId(input.tracking.gtmContainerId)
    : undefined;
  const ga4PropertyId = normalizeGa4PropertyId(google?.ga4PropertyId);

  const searchConsole = gscReady
    ? runtime("search_console", "ready", googleHealthMessage(googlePublic), `${googleHref}?tab=search-console`, true)
    : runtime(
        "search_console",
        google?.enabled ? "configuring" : "disconnected",
        googleHealthMessage(googlePublic) || "Configure Search Console OAuth in Admin → Google",
        `${googleHref}?tab=search-console`,
        Boolean(googlePublic?.hasBearerToken),
      );

  const analyticsParts: string[] = [];
  if (gtagReady && measurementId) analyticsParts.push(`Site tag ${measurementId}`);
  if (gtmReady && gtmId) analyticsParts.push(`GTM ${gtmId}`);
  if (ga4ApiReady && ga4PropertyId) analyticsParts.push(`GA4 property ${ga4PropertyId}`);
  if (gscAnalyticsReady) analyticsParts.push("GSC search analytics");

  const analyticsReady = gtagReady || ga4ApiReady || gscAnalyticsReady;
  const analytics = analyticsReady
    ? runtime(
        "analytics",
        "ready",
        analyticsParts.join(" · ") || "Analytics configured",
        `${googleHref}?tab=analytics`,
        Boolean(googlePublic?.hasBearerToken && (ga4ApiReady || gscAnalyticsReady)),
      )
    : runtime(
        "analytics",
        "disconnected",
        "Configure GA4 / GTM tracking or Analytics API in Admin → Google",
        `${googleHref}?tab=analytics`,
        false,
      );

  const indexingConfigured = Boolean(google?.serviceAccountJson?.trim());
  const indexing = indexingConfigured
    ? runtime("indexing_api", "ready", "Service account configured", `${googleHref}?tab=indexing-api`, true)
    : runtime(
        "indexing_api",
        "disconnected",
        "Add Indexing API service account JSON in Admin → Google → Indexing API",
        `${googleHref}?tab=indexing-api`,
        false,
      );

  const bing = isBingConfigured(input.integrations.bing)
    ? runtime("bing", "ready", "Bing Webmaster configured", integrationsHref, true)
    : runtime("bing", "disconnected", "Configure Bing in SEO → Integrations", integrationsHref, false);

  const indexnowDef = googleIntegrationRegistry.get("indexnow");
  const indexnowConfigured = indexnowDef?.isConfigured(ctx) || isIndexNowConfigured(input.integrations.indexnow);
  const indexnow = indexnowConfigured
    ? runtime("indexnow", "ready", "IndexNow configured", `${googleHref}?tab=indexnow`, true)
    : runtime(
        "indexnow",
        "disconnected",
        "Configure IndexNow in Admin → Google → IndexNow",
        `${googleHref}?tab=indexnow`,
        false,
      );

  const richResults = runtime(
    "rich_results",
    gscReady ? "ready" : "disconnected",
    gscReady
      ? "Uses Search Console rich-result reports"
      : "Connect Search Console to enable rich results checks",
    `${googleHref}?tab=search-console`,
    gscReady,
  );

  const platformConnectors: ConnectorConfigSnapshot[] = [];
  for (const id of ["merchant_center", "business_profile", "pagespeed", "ads"] as GoogleIntegrationId[]) {
    const def = googleIntegrationRegistry.get(id);
    const connectorId = connectorIdForIntegration(id);
    if (!def || !connectorId) continue;
    const configured = def.isConfigured(ctx);
    const connection = def.resolveConnection(ctx);
    platformConnectors.push(
      runtime(
        connectorId,
        configured || connection.state === "connected" ? "ready" : "disconnected",
        connection.message || def.description,
        `${googleHref}?tab=${def.tabId}`,
        configured,
      ),
    );
  }

  return [searchConsole, analytics, indexing, bing, indexnow, richResults, ...platformConnectors];
}

export function snapshotsToRuntimes(
  snapshots: ConnectorConfigSnapshot[],
): Partial<Record<ConnectorId, ConnectorRuntime>> {
  const out: Partial<Record<ConnectorId, ConnectorRuntime>> = {};
  for (const snap of snapshots) {
    out[snap.id] = {
      id: snap.id,
      state: snap.state,
      message: snap.message,
      lastSyncAt: snap.lastSyncAt ?? (snap.state === "ready" ? new Date().toISOString() : null),
      metrics: Object.fromEntries(
        Object.entries(snap.metrics ?? {}).filter(([, v]) => typeof v === "number") as Array<
          [string, number]
        >,
      ),
    };
  }
  return out;
}
