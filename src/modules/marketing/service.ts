import "server-only";
import { prisma } from "@/lib/prisma";
import { bootstrapMarketingModule } from "@/modules/marketing/bootstrap";
import {
  findProvider,
  listProviders,
  resolveProviderCapability,
} from "@/modules/marketing/core/registry";
import type { MarketingCapabilityId } from "@/modules/marketing/core/capabilities/types";
import { checkProviderCompatibility } from "@/modules/marketing/core/versioning";
import { marketingObservability } from "@/modules/marketing/core/observability";

export const marketingService = {
  async listPlatformOverview() {
    bootstrapMarketingModule();
    const providers = listProviders();
    const runtimes = await prisma.marketingProviderRuntime.findMany().catch(() => []);
    const connections = await prisma.marketingConnection.findMany({
      include: { accounts: true },
    }).catch(() => []);

    return providers.map((provider) => {
      const runtime = runtimes.find((r) => r.providerId === provider.id);
      const connection = connections.find((c) => c.providerId === provider.id);
      const capabilities = provider.capabilities().map((capability) =>
        resolveProviderCapability(provider.id, capability),
      );
      return {
        id: provider.id,
        displayName: provider.manifest.displayName,
        icon: provider.manifest.icon,
        capabilities,
        supportsScheduling: provider.manifest.supportsScheduling,
        supportsInsights: provider.manifest.supportsInsights,
        version: provider.manifest.version,
        compatibility: checkProviderCompatibility(provider.id),
        runtime: runtime
          ? {
              enabled: runtime.enabled,
              lifecycle: runtime.lifecycle,
              maintenanceMode: runtime.maintenanceMode,
              healthSummary: runtime.healthSummary,
              lastSyncAt: runtime.lastSyncAt?.toISOString() ?? null,
            }
          : null,
        connection: connection
          ? {
              id: connection.id,
              status: connection.status,
              lifecycle: connection.lifecycle,
              accountCount: connection.accounts.length,
              scopesMissing: connection.scopesMissing,
            }
          : null,
      };
    });
  },

  async listJobs(limit = 50) {
    return prisma.marketingJob.findMany({
      orderBy: { createdAt: "desc" },
      take: limit,
    }).catch(() => []);
  },

  async listAnalytics(limit = 100) {
    return prisma.marketingAnalyticsSnapshot.findMany({
      orderBy: { periodStart: "desc" },
      take: limit,
    }).catch(() => []);
  },

  async listLeadEvents(limit = 50) {
    return prisma.marketingLeadEvent.findMany({
      orderBy: { createdAt: "desc" },
      take: limit,
    }).catch(() => []);
  },

  async getTrackingConfigs() {
    return prisma.marketingTrackingConfig.findMany().catch(() => []);
  },

  async getDashboardStats() {
    bootstrapMarketingModule();
    const [connections, jobs, leads, telemetry] = await Promise.all([
      prisma.marketingConnection.count().catch(() => 0),
      prisma.marketingJob.groupBy({ by: ["status"], _count: true }).catch(() => []),
      prisma.marketingLeadEvent.count().catch(() => 0),
      Promise.resolve(marketingObservability.summary()),
    ]);
    return {
      connections,
      jobs,
      leads,
      telemetry,
      providers: listProviders().length,
    };
  },

  async providerHealth(providerId: string, connectionId: string) {
    bootstrapMarketingModule();
    const provider = findProvider(providerId);
    if (!provider?.health) return null;
    return provider.health(connectionId);
  },

  resolveCapability(providerId: string, capability: MarketingCapabilityId) {
    bootstrapMarketingModule();
    return resolveProviderCapability(providerId, capability);
  },
};
