import type {
  GoogleIntegrationContext,
  GoogleIntegrationId,
  GooglePlatformState,
} from "./types";
import { googleIntegrationRegistry } from "./registry";

export type GoogleWorkspaceSummary = {
  connectedServices: number;
  totalServices: number;
  healthy: number;
  warnings: number;
  errors: number;
  runningJobs: number;
  pendingJobs: number;
  lastAuthentication: string | null;
  oauthStatus: "valid" | "invalid" | "unknown";
  apiQuotaPercent: number | null;
  backgroundWorkers: "running" | "stopped" | "mixed" | "unknown";
};

export type GoogleOperationalCard = {
  id: GoogleIntegrationId;
  displayName: string;
  tabId: string;
  configureHref: string;
  connected: boolean;
  healthScore: number;
  healthMessage: string;
  quotaLabel?: string;
  quotaCurrent?: number;
  quotaMaximum?: number;
  lastSyncAt?: string | null;
  warnings: number;
  errors: number;
  pendingJobs: number;
  runningJobs: number;
  metrics: Record<string, number | string>;
  primaryOperations: Array<{ id: string; title: string }>;
  supportsValidation: boolean;
  supportsHistory: boolean;
  dependencyMessage?: string;
};

export async function buildOperationalCards(
  ctx: GoogleIntegrationContext,
): Promise<GoogleOperationalCard[]> {
  const cards: GoogleOperationalCard[] = [];
  for (const def of googleIntegrationRegistry.list()) {
    const monitoring = await googleIntegrationRegistry.monitoringFor(def.id, ctx);
    const connection = def.resolveConnection(ctx);
    const deps = googleIntegrationRegistry.checkDependencies(def.id, ctx);
    cards.push({
      id: def.id,
      displayName: def.displayName,
      tabId: def.tabId,
      configureHref: `/admin/seo/google?tab=${def.tabId}`,
      connected: connection.state === "connected" || def.isConfigured(ctx),
      healthScore: monitoring.health.score,
      healthMessage: monitoring.health.message,
      quotaLabel: monitoring.quota?.label,
      quotaCurrent: monitoring.quota?.current,
      quotaMaximum: monitoring.quota?.maximum,
      lastSyncAt: monitoring.lastSyncAt,
      warnings: monitoring.warnings,
      errors: monitoring.errors,
      pendingJobs: monitoring.pendingJobs,
      runningJobs: monitoring.runningJobs,
      metrics: monitoring.metrics,
      primaryOperations: def.operations.slice(0, 3).map((op) => ({ id: op.id, title: op.title })),
      supportsValidation: def.capabilities.supportsValidation,
      supportsHistory: def.capabilities.supportsHistory,
      dependencyMessage: deps.missing.length ? deps.message : undefined,
    });
  }
  return cards;
}

export async function buildWorkspaceSummary(
  ctx: GoogleIntegrationContext,
): Promise<GoogleWorkspaceSummary> {
  const cards = await buildOperationalCards(ctx);
  const connected = cards.filter((c) => c.connected).length;
  const healthy = cards.filter((c) => c.connected && c.healthScore >= 70 && c.errors === 0).length;
  const warnings = cards.reduce((sum, c) => sum + c.warnings, 0) + cards.filter((c) => c.connected && c.healthScore < 70 && c.errors === 0).length;
  const errors = cards.reduce((sum, c) => sum + c.errors, 0);
  const runningJobs = cards.reduce((sum, c) => sum + c.runningJobs, 0);
  const pendingJobs = cards.reduce((sum, c) => sum + c.pendingJobs, 0);

  const authTimes = cards
    .map((c) => c.lastSyncAt)
    .filter((v): v is string => Boolean(v))
    .sort()
    .reverse();

  const oauthConnected = cards.some(
    (c) => c.id === "search_console" && c.connected,
  );

  const quotaCards = cards.filter((c) => c.quotaMaximum && c.quotaMaximum > 0);
  const apiQuotaPercent =
    quotaCards.length > 0
      ? Math.round(
          (quotaCards.reduce((sum, c) => sum + (c.quotaCurrent ?? 0) / (c.quotaMaximum ?? 1), 0) /
            quotaCards.length) *
            100,
        )
      : null;

  const workerStates = await Promise.all(
    googleIntegrationRegistry.list().map(async (def) => {
      const policy = googleIntegrationRegistry.resolvePolicy(def.id, ctx);
      return policy.workerEnabled;
    }),
  );
  const enabled = workerStates.filter(Boolean).length;
  const backgroundWorkers =
    enabled === 0 ? "stopped" : enabled === workerStates.length ? "running" : "mixed";

  return {
    connectedServices: connected,
    totalServices: cards.length,
    healthy,
    warnings,
    errors,
    runningJobs,
    pendingJobs,
    lastAuthentication: authTimes[0] ?? null,
    oauthStatus: oauthConnected ? "valid" : "unknown",
    apiQuotaPercent,
    backgroundWorkers,
  };
}

export function buildContext(input: {
  platform: GooglePlatformState;
  legacyIntegrations?: GoogleIntegrationContext["legacyIntegrations"];
  tracking?: GoogleIntegrationContext["tracking"];
  env?: GoogleIntegrationContext["env"];
}): GoogleIntegrationContext {
  return {
    platform: input.platform,
    legacyIntegrations: input.legacyIntegrations,
    tracking: input.tracking,
    env: input.env,
  };
}
