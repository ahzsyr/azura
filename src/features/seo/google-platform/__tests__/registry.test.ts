import assert from "node:assert/strict";
import test from "node:test";
import Module from "node:module";

const originalLoad = (Module as unknown as { _load: (...args: unknown[]) => unknown })._load;
(Module as unknown as { _load: (...args: unknown[]) => unknown })._load = function load(
  request: string,
  ...args: unknown[]
) {
  if (request === "server-only") return {};
  return originalLoad.call(this, request, ...args);
};

async function loadRegistryModules() {
  const [
    { googleIntegrationRegistry },
    { emptyPlatformState },
    { buildContext, buildWorkspaceSummary },
    { mergePolicy },
    { executeGoogleOperation },
    { emitEvent },
    { createGoogleConnectionManager },
    { mapSeoConfigToConnectorSnapshots },
  ] = await Promise.all([
    import("../registry"),
    import("../types"),
    import("../monitoring"),
    import("../providers/shared"),
    import("../operations"),
    import("../events"),
    import("../connection-manager"),
    import("../../../search-intelligence/integrations/seo-config-map"),
  ]);
  return {
    googleIntegrationRegistry,
    emptyPlatformState,
    buildContext,
    buildWorkspaceSummary,
    mergePolicy,
    executeGoogleOperation,
    emitEvent,
    createGoogleConnectionManager,
    mapSeoConfigToConnectorSnapshots,
  };
}

test("registers all planned Google integrations", async () => {
  const { googleIntegrationRegistry } = await loadRegistryModules();
  const ids = googleIntegrationRegistry.list().map((d) => d.id);
  for (const expected of [
    "search_console",
    "analytics",
    "tag_manager",
    "merchant_center",
    "business_profile",
    "pagespeed",
    "ads",
    "indexnow",
  ]) {
    assert.ok(ids.includes(expected as never), `missing ${expected}`);
  }
  assert.equal(ids.length, 8);
  assert.ok(!ids.includes("indexing_api" as never), "indexing_api belongs under Search Engines, not Google panel");
});

test("generates tabs from the registry", async () => {
  const { googleIntegrationRegistry } = await loadRegistryModules();
  const tabs = googleIntegrationRegistry.tabs();
  assert.deepEqual(tabs[0], { id: "overview", label: "Overview" });
  assert.deepEqual(tabs[1], { id: "settings", label: "Settings" });
  assert.ok(tabs.some((t) => t.id === "merchant-center"));
  assert.ok(tabs.some((t) => t.id === "pagespeed"));
  assert.ok(tabs.some((t) => t.id === "indexnow"));
});

test("renders sections from capabilities", async () => {
  const { googleIntegrationRegistry } = await loadRegistryModules();
  const merchantSections = googleIntegrationRegistry.sectionsFor("merchant_center");
  assert.ok(!merchantSections.includes("operational_policy"));
  assert.ok(merchantSections.includes("operations"));
  assert.ok(merchantSections.includes("monitoring"));

  const gtmSections = googleIntegrationRegistry.sectionsFor("tag_manager");
  assert.ok(!gtmSections.includes("operational_policy"));
  assert.ok(gtmSections.includes("validation"));
});

test("exposes versioned contracts", async () => {
  const { googleIntegrationRegistry } = await loadRegistryModules();
  for (const def of googleIntegrationRegistry.list()) {
    assert.ok(def.contractVersion >= 1);
    assert.ok(def.schemaVersion >= 1);
    assert.ok(def.migrationVersion >= 1);
  }
});

test("merchant center phase 3 schema includes MVP set and Google checklist", async () => {
  const { googleIntegrationRegistry } = await loadRegistryModules();
  const def = googleIntegrationRegistry.get("merchant_center");
  assert.ok(def);
  assert.ok(def.schemaVersion >= 4);
  const keys = def.configurationSchema.fields.map((f) => f.key);
  for (const required of [
    "storeUrl",
    "mvpCampaignProductSet",
    "checklistWebsiteVerified",
    "checklistGmcShipping",
    "checklistReturns",
    "checklistShoppingAds",
    "checklistFeedRegistered",
    "checklistMvpApproved",
    "checklistAdsLinked",
    "validationMode",
  ]) {
    assert.ok(keys.includes(required), `missing ${required}`);
  }
});

test("inherits global defaults into service policy", async () => {
  const { googleIntegrationRegistry, emptyPlatformState, mergePolicy } = await loadRegistryModules();
  const platform = emptyPlatformState();
  platform.global.defaultRetryPolicy = { retryCount: 7, retryBackoffMs: 1000 };
  platform.global.defaultWorkerPolicy = {
    workerEnabled: false,
    parallelRequests: 4,
    timeoutMs: 12000,
  };
  const def = googleIntegrationRegistry.require("merchant_center");
  const policy = mergePolicy(platform.global, def.defaultPolicy, { cadenceMinutes: 15 });
  assert.equal(policy.cadenceMinutes, 15);
  assert.equal(policy.retryCount, 7);
  assert.equal(policy.parallelRequests, 4);
  assert.equal(policy.workerEnabled, false);
});

test("executes operations and emits lifecycle events", async () => {
  const {
    emptyPlatformState,
    buildContext,
    executeGoogleOperation,
  } = await loadRegistryModules();
  const state = emptyPlatformState();
  state.services.merchant_center = {
    configuration: { merchantId: "123", feedUrl: "https://brt-me.com/feeds/google-shopping.xml" },
    policy: {},
    schemaVersion: 1,
    migrationVersion: 1,
  };
  const ctx = buildContext({ platform: state });
  const { result, state: next } = await executeGoogleOperation(
    state,
    ctx,
    "merchant_center",
    "preview_feed",
    {},
    { dryRun: true },
  );
  assert.equal(result.ok, true);
  assert.equal(result.dryRun, true);
  assert.ok(next.events.some((e) => e.type === "SyncStarted"));
  assert.ok(next.history.some((h) => h.kind === "operation"));
});

test("connection manager connects and disconnects", async () => {
  const { createGoogleConnectionManager } = await loadRegistryModules();
  const manager = createGoogleConnectionManager();
  manager.connect("pagespeed", {
    method: "api_key",
    apiKey: "test-key",
    account: "psi",
  });
  assert.equal(manager.snapshot().services.pagespeed?.connection?.state, "connected");
  manager.disconnect("pagespeed");
  assert.equal(manager.snapshot().services.pagespeed?.connection?.state, "disconnected");
});

test("builds summary from registry providers", async () => {
  const { emptyPlatformState, buildContext, buildWorkspaceSummary } = await loadRegistryModules();
  const platform = emptyPlatformState();
  platform.services.merchant_center = {
    configuration: {
      merchantId: "BRT",
      feedUrl: "https://brt-me.com/feeds/google-shopping.xml",
    },
    policy: {},
    schemaVersion: 1,
    migrationVersion: 1,
  };
  const ctx = buildContext({ platform });
  const summary = await buildWorkspaceSummary(ctx);
  assert.equal(summary.totalServices, 8);
  assert.ok(summary.connectedServices >= 1);
});

test("Google Ads supports OAuth under SEO ownership", async () => {
  const { googleIntegrationRegistry } = await loadRegistryModules();
  const ads = googleIntegrationRegistry.require("ads");
  assert.equal(ads.capabilities.supportsOAuth, true);
  assert.ok(ads.configurationSchema.fields.some((f) => f.key === "developerToken"));
  assert.ok(ads.configurationSchema.fields.some((f) => f.key === "managerAccountId"));
  assert.ok(ads.configurationSchema.fields.some((f) => f.key === "customerId"));
});

test("maps merchant center / pagespeed / ads from platform config instead of stubs", async () => {
  const { emptyPlatformState, mapSeoConfigToConnectorSnapshots } = await loadRegistryModules();
  const platform = emptyPlatformState();
  platform.services.merchant_center = {
    configuration: {
      merchantId: "999",
      feedUrl: "https://brt-me.com/feeds/google-shopping.xml",
    },
    policy: {},
    schemaVersion: 1,
    migrationVersion: 1,
  };
  platform.services.pagespeed = {
    configuration: { apiKey: "psi-key" },
    policy: {},
    schemaVersion: 1,
    migrationVersion: 1,
  };
  platform.services.ads = {
    configuration: { customerId: "1234567890", developerToken: "dev-token", managerAccountId: "9876543210" },
    policy: {},
    schemaVersion: 1,
    migrationVersion: 1,
  };
  const snapshots = mapSeoConfigToConnectorSnapshots({
    tracking: {},
    integrations: {},
    platform,
  });
  const byId = Object.fromEntries(snapshots.map((s) => [s.id, s]));
  assert.equal(byId.merchant_center?.state, "ready");
  assert.equal(byId.pagespeed?.state, "ready");
  // SEO Ads with customer + developer token alone is NOT connected without operational OAuth+MCC
  assert.notEqual(byId.ads?.state, "ready");
  assert.match(byId.merchant_center?.configureHref ?? "", /merchant-center/);
  assert.ok(!(byId.pagespeed?.message ?? "").includes("coming soon"));

  const incompleteAds = emptyPlatformState();
  incompleteAds.services.ads = {
    configuration: { customerId: "123-456" },
    policy: {},
    schemaVersion: 1,
    migrationVersion: 1,
  };
  const incomplete = mapSeoConfigToConnectorSnapshots({
    tracking: {},
    integrations: {},
    platform: incompleteAds,
  });
  assert.notEqual(
    Object.fromEntries(incomplete.map((s) => [s.id, s])).ads?.state,
    "ready",
  );

  const withMarketing = mapSeoConfigToConnectorSnapshots({
    tracking: {},
    integrations: {},
    platform,
    marketingGoogleAds: {
      connected: true,
      operational: true,
      oauthConnected: true,
      readiness: "operational",
      customerId: "1234567890",
      hasDeveloperToken: true,
      hasLoginCustomerId: true,
    },
  });
  const adsReady = Object.fromEntries(withMarketing.map((s) => [s.id, s])).ads;
  assert.equal(adsReady?.state, "ready");
});

test("records config updates in history", async () => {
  const { emptyPlatformState, emitEvent } = await loadRegistryModules();
  const next = emitEvent(emptyPlatformState(), "ConfigUpdated", "global", "saved");
  assert.equal(next.events[0]?.type, "ConfigUpdated");
  assert.equal(next.history[0]?.kind, "config");
});
