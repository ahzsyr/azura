import { ALL_GOOGLE_INTEGRATION_DEFINITIONS } from "./definitions";
import type {
  GoogleIntegrationCapabilities,
  GoogleIntegrationDefinition,
  GoogleIntegrationId,
  GoogleIntegrationContext,
  GoogleMonitoringSnapshot,
  GoogleOperationalPolicy,
} from "./types";
import { GOOGLE_PLATFORM_CONTRACT_VERSION } from "./types";
import { mergePolicy } from "./providers/shared";

export type DependencyCheckResult = {
  ok: boolean;
  missing: Array<{ integrationId: GoogleIntegrationId; reason: string; required: boolean }>;
  message: string;
};

/**
 * Single source of truth for Google service discovery and composition.
 * Tabs, pages, cards, summaries, automation, and monitoring are generated from this registry.
 */
export function createGoogleIntegrationRegistry(
  definitions: GoogleIntegrationDefinition[] = ALL_GOOGLE_INTEGRATION_DEFINITIONS,
) {
  const byId = new Map<GoogleIntegrationId, GoogleIntegrationDefinition>();
  for (const def of definitions) {
    if (def.contractVersion > GOOGLE_PLATFORM_CONTRACT_VERSION) {
      throw new Error(
        `Integration ${def.id} requires contract v${def.contractVersion}, platform is v${GOOGLE_PLATFORM_CONTRACT_VERSION}`,
      );
    }
    byId.set(def.id, def);
  }

  function list(): GoogleIntegrationDefinition[] {
    return definitions.slice();
  }

  function get(id: GoogleIntegrationId): GoogleIntegrationDefinition | undefined {
    return byId.get(id);
  }

  function require(id: GoogleIntegrationId): GoogleIntegrationDefinition {
    const def = byId.get(id);
    if (!def) throw new Error(`Unknown Google integration: ${id}`);
    return def;
  }

  function tabs() {
    return [
      { id: "overview", label: "Overview" },
      { id: "settings", label: "Settings" },
      ...definitions.map((d) => ({ id: d.tabId, label: d.displayName, integrationId: d.id })),
    ];
  }

  function byTabId(tabId: string): GoogleIntegrationDefinition | undefined {
    return definitions.find((d) => d.tabId === tabId);
  }

  function capabilities(id: GoogleIntegrationId): GoogleIntegrationCapabilities {
    return require(id).capabilities;
  }

  function sectionsFor(id: GoogleIntegrationId): string[] {
    const caps = capabilities(id);
    const sections = ["connection", "configuration"];
    if (caps.supportsAutomation) sections.push("operational_policy");
    if (caps.supportsValidation) sections.push("validation");
    if (caps.supportsRunNow) sections.push("operations");
    if (caps.supportsMonitoring) sections.push("monitoring");
    sections.push("permissions");
    if (caps.supportsHistory) sections.push("history");
    return sections;
  }

  function checkDependencies(id: GoogleIntegrationId, ctx: GoogleIntegrationContext): DependencyCheckResult {
    const def = require(id);
    const missing: DependencyCheckResult["missing"] = [];
    for (const dep of def.dependencies) {
      const depDef = byId.get(dep.integrationId);
      if (!depDef) continue;
      if (!depDef.isConfigured(ctx)) {
        missing.push({
          integrationId: dep.integrationId,
          reason: dep.reason,
          required: dep.required,
        });
      }
    }
    const blocking = missing.filter((m) => m.required);
    return {
      ok: blocking.length === 0,
      missing,
      message:
        blocking.length > 0
          ? `Blocked by: ${blocking.map((m) => m.integrationId).join(", ")}`
          : missing.length > 0
            ? `Optional dependencies missing: ${missing.map((m) => m.integrationId).join(", ")}`
            : "Dependencies satisfied",
    };
  }

  async function monitoringFor(
    id: GoogleIntegrationId,
    ctx: GoogleIntegrationContext,
  ): Promise<GoogleMonitoringSnapshot> {
    const def = require(id);
    const health = await def.healthProvider.evaluate(ctx);
    const quota = def.capabilities.supportsQuota ? await def.quotaProvider.evaluate(ctx) : null;
    const stored = ctx.platform.services[id]?.monitoring;
    return {
      health,
      quota,
      runningJobs: stored?.runningJobs ?? 0,
      pendingJobs: stored?.pendingJobs ?? health.jobBacklog ?? 0,
      lastSyncAt: stored?.lastSyncAt ?? health.lastSuccessAt ?? null,
      warnings: stored?.warnings ?? 0,
      errors: stored?.errors ?? (health.authentication === "error" ? 1 : 0),
      metrics: stored?.metrics ?? {},
    };
  }

  function resolvePolicy(id: GoogleIntegrationId, ctx: GoogleIntegrationContext): GoogleOperationalPolicy {
    const def = require(id);
    const override = ctx.platform.services[id]?.policy;
    return mergePolicy(ctx.platform.global, def.defaultPolicy, override);
  }

  function connectionSummary(ctx: GoogleIntegrationContext) {
    const items = definitions.map((def) => {
      const configured = def.isConfigured(ctx);
      const connection = def.resolveConnection(ctx);
      return { id: def.id, configured, connection };
    });
    const connected = items.filter((i) => i.configured || i.connection.state === "connected").length;
    return {
      total: definitions.length,
      connected,
      disconnected: definitions.length - connected,
      items,
    };
  }

  return {
    list,
    get,
    require,
    tabs,
    byTabId,
    capabilities,
    sectionsFor,
    checkDependencies,
    monitoringFor,
    resolvePolicy,
    connectionSummary,
    definitions,
  };
}

export type GoogleIntegrationRegistry = ReturnType<typeof createGoogleIntegrationRegistry>;

/** Shared singleton registry for admin/runtime composition. */
export const googleIntegrationRegistry = createGoogleIntegrationRegistry();
