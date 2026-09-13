import "server-only";

import { seoRepository } from "@/repositories/seo.repository";
import { getPublicGooglePlatformState, getGooglePlatformState } from "./persistence";
import { buildContext, buildOperationalCards, buildWorkspaceSummary } from "./monitoring";
import { googleIntegrationRegistry } from "./registry";
import { listHistoryFor } from "./events";
import type { GoogleIntegrationId } from "./types";
import { loadMarketingGoogleAdsContext } from "./marketing-ads-bridge";
import { readBusinessProfileDiscovery, isBusinessProfileRateLimited } from "@/features/seo/google-live/business-profile-cache";

export async function loadGooglePlatformAdminData(options?: { public?: boolean }) {
  const [platform, integrations, tracking, marketingGoogleAds] = await Promise.all([
    options?.public ? getPublicGooglePlatformState() : getGooglePlatformState(),
    seoRepository.getPublicIntegrationsConfig().catch(() => ({})),
    seoRepository.getTrackingConfig().catch(() => ({})),
    loadMarketingGoogleAdsContext(),
  ]);

  const ctx = buildContext({
    platform,
    legacyIntegrations: integrations as never,
    tracking: tracking as never,
    env: {
      gaId: process.env.NEXT_PUBLIC_GA_ID,
    },
    marketingGoogleAds,
  });

  const [summary, cards] = await Promise.all([
    buildWorkspaceSummary(ctx),
    buildOperationalCards(ctx),
  ]);

  return { platform, integrations, tracking, ctx, summary, cards };
}

export async function loadGoogleIntegrationPageData(integrationId: GoogleIntegrationId) {
  if (integrationId === "business_profile") {
    try {
      const { clearExpiredBusinessProfileRateLimitIfNeeded } = await import(
        "@/features/seo/google-live/business-profile"
      );
      await clearExpiredBusinessProfileRateLimitIfNeeded();
    } catch {
      // Best-effort; page must still render.
    }
  }

  const { platform, ctx } = await loadGooglePlatformAdminData({ public: true });
  const def = googleIntegrationRegistry.require(integrationId);
  const sections = googleIntegrationRegistry.sectionsFor(integrationId);
  let connection = def.resolveConnection(ctx);
  const configuration = platform.services[integrationId]?.configuration ?? {};
  const policy = googleIntegrationRegistry.resolvePolicy(integrationId, ctx);
  const monitoring = await googleIntegrationRegistry.monitoringFor(integrationId, ctx);
  const history = listHistoryFor(platform, integrationId, 30);
  const deps = googleIntegrationRegistry.checkDependencies(integrationId, ctx);
  const discovery =
    integrationId === "business_profile" ? readBusinessProfileDiscovery(platform) : null;

  if (
    integrationId === "business_profile" &&
    discovery &&
    connection.message &&
    !isBusinessProfileRateLimited(discovery)
  ) {
    const { isBusinessProfileRateLimitError } = await import(
      "@/features/seo/google-live/business-profile-cache"
    );
    if (isBusinessProfileRateLimitError(connection.message)) {
      connection = { ...connection, message: "Connected" };
    }
  }

  return {
    definition: {
      ...def,
      // Strip non-serializable handlers for client components
      healthProvider: undefined,
      quotaProvider: undefined,
      automationProvider: undefined,
      validationHandler: undefined,
      operationHandlers: undefined,
      resolveConnection: undefined,
      isConfigured: undefined,
    },
    serializableDefinition: {
      id: def.id,
      displayName: def.displayName,
      icon: def.icon,
      category: def.category,
      description: def.description,
      requiredScopes: def.requiredScopes,
      capabilities: def.capabilities,
      operations: def.operations,
      configurationSchema: def.configurationSchema,
      defaultPolicy: def.defaultPolicy,
      dependencies: def.dependencies,
      contractVersion: def.contractVersion,
      schemaVersion: def.schemaVersion,
      migrationVersion: def.migrationVersion,
      connectorId: def.connectorId,
      tabId: def.tabId,
    },
    sections,
    connection,
    configuration,
    policy,
    monitoring,
    history,
    dependencyMessage: deps.missing.length ? deps.message : undefined,
    marketingGoogleAds: ctx.marketingGoogleAds ?? null,
    discovery,
  };
}
