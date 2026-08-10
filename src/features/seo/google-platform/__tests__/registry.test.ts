import assert from "node:assert/strict";
import test from "node:test";
import { googleIntegrationRegistry } from "../registry";
import { emptyPlatformState } from "../types";
import { buildContext, buildWorkspaceSummary } from "../monitoring";
import { mergePolicy } from "../providers/shared";
import { executeGoogleOperation } from "../operations";
import { emitEvent } from "../events";
import { createGoogleConnectionManager } from "../connection-manager";
import { mapSeoConfigToConnectorSnapshots } from "../../../search-intelligence/integrations/seo-config-map";

test("registers all planned Google integrations", () => {
  const ids = googleIntegrationRegistry.list().map((d) => d.id);
  for (const expected of [
    "search_console",
    "analytics",
    "tag_manager",
    "merchant_center",
    "business_profile",
    "pagespeed",
    "ads",
    "indexing_api",
    "indexnow",
  ]) {
    assert.ok(ids.includes(expected as never), `missing ${expected}`);
  }
  assert.equal(ids.length, 9);
});

test("generates tabs from the registry", () => {
  const tabs = googleIntegrationRegistry.tabs();
  assert.deepEqual(tabs[0], { id: "overview", label: "Overview" });
  assert.deepEqual(tabs[1], { id: "settings", label: "Settings" });
  assert.ok(tabs.some((t) => t.id === "merchant-center"));
  assert.ok(tabs.some((t) => t.id === "pagespeed"));
  assert.ok(tabs.some((t) => t.id === "indexnow"));
});

test("renders sections from capabilities", () => {
  const merchantSections = googleIntegrationRegistry.sectionsFor("merchant_center");
  assert.ok(merchantSections.includes("operational_policy"));
  assert.ok(merchantSections.includes("operations"));
  assert.ok(merchantSections.includes("monitoring"));

  const gtmSections = googleIntegrationRegistry.sectionsFor("tag_manager");
  assert.ok(!gtmSections.includes("operational_policy"));
  assert.ok(gtmSections.includes("validation"));
});

test("exposes versioned contracts", () => {
  for (const def of googleIntegrationRegistry.list()) {
    assert.ok(def.contractVersion >= 1);
    assert.ok(def.schemaVersion >= 1);
    assert.ok(def.migrationVersion >= 1);
  }
});

test("inherits global defaults into service policy", () => {
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
  const state = emptyPlatformState();
  state.services.merchant_center = {
    configuration: { merchantId: "123" },
    policy: {},
    schemaVersion: 1,
    migrationVersion: 1,
  };
  const ctx = buildContext({ platform: state });
  const { result, state: next } = await executeGoogleOperation(
    state,
    ctx,
    "merchant_center",
    "generate_feed",
    {},
    { dryRun: true },
  );
  assert.equal(result.ok, true);
  assert.equal(result.dryRun, true);
  assert.ok(next.events.some((e) => e.type === "SyncStarted"));
  assert.ok(next.history.some((h) => h.kind === "operation"));
});

test("connection manager connects and disconnects", () => {
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
  const platform = emptyPlatformState();
  platform.services.merchant_center = {
    configuration: { merchantId: "BRT" },
    policy: {},
    schemaVersion: 1,
    migrationVersion: 1,
  };
  const ctx = buildContext({ platform });
  const summary = await buildWorkspaceSummary(ctx);
  assert.equal(summary.totalServices, 9);
  assert.ok(summary.connectedServices >= 1);
});

test("maps merchant center / pagespeed / ads from platform config instead of stubs", () => {
  const platform = emptyPlatformState();
  platform.services.merchant_center = {
    configuration: { merchantId: "999" },
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
    configuration: { customerId: "123-456" },
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
  assert.equal(byId.ads?.state, "ready");
  assert.match(byId.merchant_center?.configureHref ?? "", /merchant-center/);
  assert.ok(!(byId.pagespeed?.message ?? "").includes("coming soon"));
});

test("records config updates in history", () => {
  const next = emitEvent(emptyPlatformState(), "ConfigUpdated", "global", "saved");
  assert.equal(next.events[0]?.type, "ConfigUpdated");
  assert.equal(next.history[0]?.kind, "config");
});
