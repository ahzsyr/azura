import type { ConnectorHealth, ConnectorState } from "../types";

export type ConnectorId =
  | "search_console"
  | "analytics"
  | "merchant_center"
  | "business_profile"
  | "pagespeed"
  | "indexing_api"
  | "rich_results"
  | "ads"
  | "bing"
  | "indexnow";

export type ConnectorDefinition = {
  id: ConnectorId;
  label: string;
  permissions: string[];
  syncCadenceMinutes: number;
};

export const CONNECTOR_DEFINITIONS: ConnectorDefinition[] = [
  { id: "search_console", label: "Search Console", permissions: ["webmasters.readonly"], syncCadenceMinutes: 60 },
  { id: "analytics", label: "Google Analytics", permissions: ["analytics.readonly"], syncCadenceMinutes: 60 },
  { id: "merchant_center", label: "Merchant Center", permissions: ["content"], syncCadenceMinutes: 120 },
  { id: "business_profile", label: "Business Profile", permissions: ["business.manage"], syncCadenceMinutes: 180 },
  { id: "pagespeed", label: "PageSpeed Insights", permissions: ["pagespeed"], syncCadenceMinutes: 360 },
  { id: "indexing_api", label: "Indexing API", permissions: ["indexing"], syncCadenceMinutes: 30 },
  { id: "rich_results", label: "Rich Results", permissions: ["searchconsole"], syncCadenceMinutes: 360 },
  { id: "ads", label: "Google Ads", permissions: ["adwords"], syncCadenceMinutes: 360 },
  { id: "bing", label: "Bing Webmaster", permissions: ["bing"], syncCadenceMinutes: 120 },
  { id: "indexnow", label: "IndexNow", permissions: ["indexnow"], syncCadenceMinutes: 15 },
];

export type ConnectorRuntime = {
  id: ConnectorId;
  state: ConnectorState;
  message: string;
  lastSyncAt?: string | null;
  metrics: Record<string, number>;
};

export function createConnectorFramework(initial?: Partial<Record<ConnectorId, ConnectorRuntime>>) {
  const runtimes = new Map<ConnectorId, ConnectorRuntime>();
  for (const def of CONNECTOR_DEFINITIONS) {
    runtimes.set(
      def.id,
      initial?.[def.id] ?? {
        id: def.id,
        state: "disconnected",
        message: "Not configured",
        lastSyncAt: null,
        metrics: {},
      },
    );
  }

  function setState(id: ConnectorId, state: ConnectorState, message: string) {
    const current = runtimes.get(id)!;
    runtimes.set(id, { ...current, state, message });
  }

  function health(id: ConnectorId): ConnectorHealth {
    const runtime = runtimes.get(id)!;
    const ok = runtime.state === "ready" || runtime.state === "syncing";
    return {
      connectorId: id,
      state: runtime.state,
      ok,
      message: runtime.message,
      lastSyncAt: runtime.lastSyncAt,
      metrics: runtime.metrics,
    };
  }

  return {
    definitions: CONNECTOR_DEFINITIONS,
    get(id: ConnectorId) {
      return runtimes.get(id)!;
    },
    listHealth(): ConnectorHealth[] {
      return CONNECTOR_DEFINITIONS.map((d) => health(d.id));
    },
    applyRuntime(id: ConnectorId, runtime: Partial<ConnectorRuntime> & Pick<ConnectorRuntime, "state" | "message">) {
      const current = runtimes.get(id)!;
      runtimes.set(id, {
        ...current,
        ...runtime,
        id,
        metrics: runtime.metrics ?? current.metrics,
      });
    },
    configure(id: ConnectorId) {
      setState(id, "configuring", "Awaiting credentials");
    },
    authenticate(id: ConnectorId, ok: boolean, message?: string) {
      setState(id, ok ? "ready" : "error", message ?? (ok ? "Authenticated" : "Authentication failed"));
    },
    beginSync(id: ConnectorId) {
      setState(id, "syncing", "Sync in progress");
    },
    completeSync(id: ConnectorId, metrics: Record<string, number> = {}) {
      const current = runtimes.get(id)!;
      runtimes.set(id, {
        ...current,
        state: "ready",
        message: "Sync completed",
        lastSyncAt: new Date().toISOString(),
        metrics: { ...current.metrics, ...metrics },
      });
    },
    fail(id: ConnectorId, message: string, rateLimited = false) {
      setState(id, rateLimited ? "rate_limited" : "error", message);
    },
    recover(id: ConnectorId) {
      setState(id, "recovering", "Attempting recovery");
    },
  };
}

export type ConnectorFramework = ReturnType<typeof createConnectorFramework>;
