import "server-only";

import { seoRepository } from "@/repositories/seo.repository";
import type { SeoIntegrationsConfig, SeoTrackingConfig } from "@/features/seo/types";
import {
  googleHealthMessage,
  isGa4AnalyticsReady,
  isGscSitemapReady,
} from "@/features/seo/admin/google-integration-readiness";
import { verifyGoogleIntegrationAccess } from "@/features/seo/integrations/google-verify";
import { bingProvider, indexNowProvider } from "@/features/seo/integrations/providers";
import { getGooglePlatformState } from "@/features/seo/google-platform/persistence";
import { buildContext } from "@/features/seo/google-platform/monitoring";
import { googleIntegrationRegistry } from "@/features/seo/google-platform/registry";
import type { GoogleIntegrationId } from "@/features/seo/google-platform/types";
import type { ConnectorFramework, ConnectorId } from "./index";
import {
  mapSeoConfigToConnectorSnapshots,
  snapshotsToRuntimes,
  type ConnectorConfigSnapshot,
} from "./seo-config-map";

export type { ConnectorConfigSnapshot };

const emptyTracking: SeoTrackingConfig = {};
const emptyIntegrations: SeoIntegrationsConfig = {};

export async function loadSeoConnectorSnapshots(): Promise<ConnectorConfigSnapshot[]> {
  const [tracking, integrations, platform] = await Promise.all([
    seoRepository.getTrackingConfig().catch(() => emptyTracking),
    seoRepository.getIntegrationsConfig().catch(() => emptyIntegrations),
    getGooglePlatformState().catch(() => undefined),
  ]);
  return mapSeoConfigToConnectorSnapshots({
    tracking,
    integrations,
    envGaId: process.env.NEXT_PUBLIC_GA_ID,
    platform,
  });
}

export async function hydrateConnectorsFromSeoConfig(
  connectors: ConnectorFramework,
): Promise<ConnectorConfigSnapshot[]> {
  const snapshots = await loadSeoConnectorSnapshots();
  const runtimes = snapshotsToRuntimes(snapshots);
  for (const [id, runtime] of Object.entries(runtimes) as Array<
    [ConnectorId, NonNullable<(typeof runtimes)[ConnectorId]>]
  >) {
    connectors.applyRuntime(id, runtime);
  }
  return snapshots;
}

function connectorToIntegrationId(connectorId: ConnectorId): GoogleIntegrationId | null {
  const map: Partial<Record<ConnectorId, GoogleIntegrationId>> = {
    search_console: "search_console",
    analytics: "analytics",
    merchant_center: "merchant_center",
    business_profile: "business_profile",
    pagespeed: "pagespeed",
    indexing_api: "indexing_api",
    ads: "ads",
    indexnow: "indexnow",
  };
  return map[connectorId] ?? null;
}

export async function testSeoConnector(connectorId: ConnectorId): Promise<{
  ok: boolean;
  message: string;
  state: "ready" | "error" | "disconnected" | "configuring";
}> {
  const [integrations, platform, tracking] = await Promise.all([
    seoRepository.getIntegrationsConfig().catch(() => emptyIntegrations),
    getGooglePlatformState(),
    seoRepository.getTrackingConfig().catch(() => emptyTracking),
  ]);
  const google = integrations.google;

  const integrationId = connectorToIntegrationId(connectorId);
  if (
    integrationId &&
    (connectorId === "merchant_center" ||
      connectorId === "business_profile" ||
      connectorId === "pagespeed" ||
      connectorId === "ads" ||
      connectorId === "indexnow" ||
      connectorId === "indexing_api")
  ) {
    const ctx = buildContext({
      platform,
      legacyIntegrations: integrations as never,
      tracking: tracking as never,
      env: { gaId: process.env.NEXT_PUBLIC_GA_ID },
    });
    const def = googleIntegrationRegistry.get(integrationId);
    if (!def) {
      return { ok: false, message: "Unknown integration", state: "disconnected" };
    }
    const result = await def.validationHandler.validate(ctx);
    return {
      ok: result.ok,
      message: result.message,
      state: result.ok ? "ready" : "disconnected",
    };
  }

  if (connectorId === "search_console" || connectorId === "analytics" || connectorId === "rich_results") {
    if (!google?.enabled && connectorId === "search_console") {
      return { ok: false, message: "Search Console integration is disabled", state: "disconnected" };
    }
    if (!google) {
      return {
        ok: false,
        message: "Connect Google OAuth in Admin → Google first",
        state: "configuring",
      };
    }
    if (!google.bearerToken?.trim() && !google.refreshToken) {
      return {
        ok: false,
        message: "Connect Google OAuth in Admin → Google first",
        state: "configuring",
      };
    }
    try {
      const verification = await verifyGoogleIntegrationAccess(google, { timeoutMs: 10000 });
      const ok =
        connectorId === "analytics"
          ? Boolean(
              verification.gscSiteAccessible ||
                (isGa4AnalyticsReady(google) && verification.ga4Accessible !== false),
            )
          : Boolean(verification.gscSiteAccessible && isGscSitemapReady(google));
      const message = googleHealthMessage(google, verification);
      return {
        ok,
        message: ok ? `Live check passed · ${message}` : message,
        state: ok ? "ready" : "error",
      };
    } catch (err) {
      return {
        ok: false,
        message: err instanceof Error ? err.message : String(err),
        state: "error",
      };
    }
  }

  if (connectorId === "bing") {
    const ok = bingProvider.isConfigured(integrations.bing);
    return {
      ok,
      message: ok ? "Bing Webmaster credentials present" : "Configure Bing in SEO → Integrations",
      state: ok ? "ready" : "disconnected",
    };
  }

  if (connectorId === "indexnow") {
    const ok = indexNowProvider.isConfigured(integrations.indexnow);
    return {
      ok,
      message: ok ? "IndexNow key present" : "Configure IndexNow in Admin → Google → IndexNow",
      state: ok ? "ready" : "disconnected",
    };
  }

  return {
    ok: false,
    message: "Live test is not available for this connector yet",
    state: "disconnected",
  };
}
