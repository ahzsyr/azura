import assert from "node:assert/strict";
import test from "node:test";
import Module from "node:module";

const originalLoad = (Module as unknown as { _load: (...args: unknown[]) => unknown })._load;
(Module as unknown as { _load: (...args: unknown[]) => unknown })._load = function load(
  request: string,
  ...args: unknown[]
) {
  if (request === "server-only") return {};
  if (request === "@prisma/client") {
    return {
      Prisma: {},
      PrismaClient: class PrismaClient {
        constructor() {}
        $extends() {
          return this;
        }
      },
    };
  }
  return originalLoad.call(this, request, ...args);
};

async function loadModules() {
  const [{ emptyPlatformState }, cache, errors, bp, monitoring, registry, operations] = await Promise.all([
    import("../../google-platform/types"),
    import("../business-profile-cache"),
    import("../google-api-error"),
    import("../business-profile"),
    import("../../google-platform/monitoring"),
    import("../../google-platform/registry"),
    import("../../google-platform/operations"),
  ]);
  return {
    emptyPlatformState,
    BUSINESS_PROFILE_SCOPE: cache.BUSINESS_PROFILE_SCOPE,
    BUSINESS_PROFILE_RATE_LIMITED_MESSAGE: errors.BUSINESS_PROFILE_RATE_LIMITED_MESSAGE,
    normalizeBusinessProfileDiscovery: cache.normalizeBusinessProfileDiscovery,
    readBusinessProfileDiscovery: cache.readBusinessProfileDiscovery,
    isBusinessProfileRateLimited: cache.isBusinessProfileRateLimited,
    isBusinessProfileRateLimitError: cache.isBusinessProfileRateLimitError,
    setBusinessProfileRuntimeForTests: bp.setBusinessProfileRuntimeForTests,
    syncBusinessProfileAfterOAuth: bp.syncBusinessProfileAfterOAuth,
    syncBusinessProfileLocations: bp.syncBusinessProfileLocations,
    bootstrapBusinessProfileDiscoveryIfNeeded: bp.bootstrapBusinessProfileDiscoveryIfNeeded,
    clearExpiredBusinessProfileRateLimitIfNeeded: bp.clearExpiredBusinessProfileRateLimitIfNeeded,
    buildContext: monitoring.buildContext,
    googleIntegrationRegistry: registry.googleIntegrationRegistry,
    validateGoogleIntegration: operations.validateGoogleIntegration,
  };
}

function jsonResponse(status: number, body: unknown, headers: Record<string, string> = {}) {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: {
      get(name: string) {
        return headers[name.toLowerCase()] ?? null;
      },
    },
    text: async () => JSON.stringify(body),
  } as Response;
}

test("fresh cache skips Google fetch", async () => {
  const {
    emptyPlatformState,
    BUSINESS_PROFILE_SCOPE,
    setBusinessProfileRuntimeForTests,
    syncBusinessProfileLocations,
  } = await loadModules();
  const now = Date.parse("2026-09-03T12:00:00.000Z");
  let state = emptyPlatformState();
  state.services.business_profile = {
    configuration: {},
    policy: {},
    connection: {
      state: "connected",
      grantedScopes: [BUSINESS_PROFILE_SCOPE],
      missingScopes: [],
      authMethod: "oauth",
    },
    discovery: {
      accounts: [{ name: "accounts/1", accountName: "BRT" }],
      locations: [{ name: "locations/1", title: "Dubai" }],
      businessAccountId: "accounts/1",
      locationId: "locations/1",
      lastSyncedAt: new Date(now - 60_000).toISOString(),
      rateLimitedUntil: null,
      lastError: null,
    },
    schemaVersion: 1,
    migrationVersion: 1,
  };
  let fetches = 0;
  setBusinessProfileRuntimeForTests({
    now: () => now,
    sleep: async () => {},
    fetch: async () => {
      fetches += 1;
      return jsonResponse(200, { accounts: [] });
    },
    loadState: async () => state,
    saveState: async (next) => {
      state = next;
    },
    resolveToken: async () => "token",
  });

  const result = await syncBusinessProfileLocations();
  assert.equal(result.ok, true);
  assert.equal(fetches, 0);
  assert.equal(result.live, false);
  setBusinessProfileRuntimeForTests(null);
});

test("concurrent syncs share one in-flight Google request", async () => {
  const {
    emptyPlatformState,
    BUSINESS_PROFILE_SCOPE,
    setBusinessProfileRuntimeForTests,
    syncBusinessProfileLocations,
  } = await loadModules();
  const now = Date.parse("2026-09-03T12:00:00.000Z");
  let state = emptyPlatformState();
  state.services.business_profile = {
    configuration: {},
    policy: {},
    connection: {
      state: "connected",
      grantedScopes: [BUSINESS_PROFILE_SCOPE],
      missingScopes: [],
      authMethod: "oauth",
    },
    schemaVersion: 1,
    migrationVersion: 1,
  };
  let fetches = 0;
  setBusinessProfileRuntimeForTests({
    now: () => now,
    sleep: async () => {},
    fetch: async () => {
      fetches += 1;
      await new Promise((resolve) => setTimeout(resolve, 40));
      return jsonResponse(200, { accounts: [] });
    },
    loadState: async () => state,
    saveState: async (next) => {
      state = next;
    },
    resolveToken: async () => "token",
  });

  const [a, b] = await Promise.all([
    syncBusinessProfileLocations({ force: true }),
    syncBusinessProfileLocations({ force: true }),
  ]);
  assert.equal(a.ok, true);
  assert.equal(b.ok, true);
  assert.equal(fetches, 1);
  setBusinessProfileRuntimeForTests(null);
});

test("429 persists cooldown and a follow-up sync does not fetch", async () => {
  const {
    emptyPlatformState,
    BUSINESS_PROFILE_SCOPE,
    setBusinessProfileRuntimeForTests,
    syncBusinessProfileLocations,
  } = await loadModules();
  const now = Date.parse("2026-09-03T12:00:00.000Z");
  let state = emptyPlatformState();
  state.services.business_profile = {
    configuration: {},
    policy: {},
    connection: {
      state: "connected",
      grantedScopes: [BUSINESS_PROFILE_SCOPE],
      missingScopes: [],
      authMethod: "oauth",
    },
    schemaVersion: 1,
    migrationVersion: 1,
  };
  let fetches = 0;
  setBusinessProfileRuntimeForTests({
    now: () => now,
    sleep: async () => {},
    fetch: async () => {
      fetches += 1;
      return jsonResponse(429, { error: { message: "Quota exceeded" } }, { "retry-after": "60" });
    },
    loadState: async () => state,
    saveState: async (next) => {
      state = next;
    },
    resolveToken: async () => "token",
  });

  const first = await syncBusinessProfileLocations({ force: true });
  assert.equal(first.ok, false);
  assert.match(first.message, /rate-limited/i);
  assert.ok(state.services.business_profile?.discovery?.rateLimitedUntil);
  assert.equal(fetches, 1);
  assert.equal(state.services.business_profile?.monitoring?.errors, 0);
  assert.equal(state.services.business_profile?.monitoring?.warnings, 1);

  const until = Date.parse(state.services.business_profile!.discovery!.rateLimitedUntil!);
  assert.equal(until, now + 15 * 60 * 1000);

  const second = await syncBusinessProfileLocations({ force: true });
  assert.equal(second.ok, false);
  assert.equal(fetches, 1);
  setBusinessProfileRuntimeForTests(null);
});

test("429 without Retry-After uses 15-minute cooldown fallback", async () => {
  const {
    emptyPlatformState,
    BUSINESS_PROFILE_SCOPE,
    setBusinessProfileRuntimeForTests,
    syncBusinessProfileLocations,
  } = await loadModules();
  const { BUSINESS_PROFILE_COOLDOWN_FALLBACK_MS } = await import("../business-profile-cache");
  const now = Date.parse("2026-09-03T12:00:00.000Z");
  let state = emptyPlatformState();
  state.services.business_profile = {
    configuration: {},
    policy: {},
    connection: {
      state: "connected",
      grantedScopes: [BUSINESS_PROFILE_SCOPE],
      missingScopes: [],
      authMethod: "oauth",
    },
    schemaVersion: 1,
    migrationVersion: 1,
  };
  setBusinessProfileRuntimeForTests({
    now: () => now,
    sleep: async () => {},
    fetch: async () => jsonResponse(429, { error: { message: "Quota exceeded" } }),
    loadState: async () => state,
    saveState: async (next) => {
      state = next;
    },
    resolveToken: async () => "token",
  });

  const result = await syncBusinessProfileLocations({ force: true });
  assert.equal(result.ok, false);
  const until = Date.parse(state.services.business_profile!.discovery!.rateLimitedUntil!);
  assert.equal(until, now + BUSINESS_PROFILE_COOLDOWN_FALLBACK_MS);
  assert.equal(BUSINESS_PROFILE_COOLDOWN_FALLBACK_MS, 15 * 60 * 1000);
  setBusinessProfileRuntimeForTests(null);
});

test("force true with future rateLimitedUntil does not fetch", async () => {
  const {
    emptyPlatformState,
    BUSINESS_PROFILE_SCOPE,
    BUSINESS_PROFILE_RATE_LIMITED_MESSAGE,
    setBusinessProfileRuntimeForTests,
    syncBusinessProfileLocations,
  } = await loadModules();
  const now = Date.parse("2026-09-03T12:00:00.000Z");
  let state = emptyPlatformState();
  state.services.business_profile = {
    configuration: {},
    policy: {},
    connection: {
      state: "connected",
      grantedScopes: [BUSINESS_PROFILE_SCOPE],
      missingScopes: [],
      authMethod: "oauth",
    },
    discovery: {
      accounts: [],
      locations: [],
      lastSyncedAt: null,
      rateLimitedUntil: new Date(now + 60_000).toISOString(),
      lastError: BUSINESS_PROFILE_RATE_LIMITED_MESSAGE,
    },
    schemaVersion: 1,
    migrationVersion: 1,
  };
  let fetches = 0;
  setBusinessProfileRuntimeForTests({
    now: () => now,
    sleep: async () => {},
    fetch: async () => {
      fetches += 1;
      return jsonResponse(200, { accounts: [] });
    },
    loadState: async () => state,
    saveState: async (next) => {
      state = next;
    },
    resolveToken: async () => "token",
  });

  const result = await syncBusinessProfileLocations({ force: true });
  assert.equal(result.ok, false);
  assert.equal(fetches, 0);
  assert.match(result.message, /rate-limited/i);
  setBusinessProfileRuntimeForTests(null);
});

test("OAuth post-sync 429 still leaves Business Profile connected", async () => {
  const {
    emptyPlatformState,
    BUSINESS_PROFILE_SCOPE,
    setBusinessProfileRuntimeForTests,
    syncBusinessProfileAfterOAuth,
    buildContext,
    googleIntegrationRegistry,
  } = await loadModules();
  const now = Date.parse("2026-09-03T12:00:00.000Z");
  let state = emptyPlatformState();
  state.services.business_profile = {
    configuration: {},
    policy: {},
    connection: {
      state: "connected",
      grantedScopes: [BUSINESS_PROFILE_SCOPE],
      missingScopes: [],
      authMethod: "oauth",
    },
    schemaVersion: 1,
    migrationVersion: 1,
  };
  setBusinessProfileRuntimeForTests({
    now: () => now,
    sleep: async () => {},
    fetch: async () => jsonResponse(429, { error: { message: "Quota exceeded" } }, { "retry-after": "60" }),
    loadState: async () => state,
    saveState: async (next) => {
      state = next;
    },
    resolveToken: async () => "token",
  });

  const result = await syncBusinessProfileAfterOAuth();
  assert.ok(result);
  assert.equal(result.ok, false);
  assert.ok(state.services.business_profile?.discovery?.rateLimitedUntil);
  assert.equal(state.services.business_profile?.connection?.state, "connected");

  const ctx = buildContext({
    platform: state,
    legacyIntegrations: { google: { bearerToken: "token", enabled: true } },
  });
  assert.equal(googleIntegrationRegistry.require("business_profile").isConfigured(ctx), true);
  setBusinessProfileRuntimeForTests(null);
});

test("validating business profile does not fetch Google", async () => {
  const {
    emptyPlatformState,
    BUSINESS_PROFILE_SCOPE,
    buildContext,
    validateGoogleIntegration,
  } = await loadModules();
  const state = emptyPlatformState();
  state.services.business_profile = {
    configuration: {},
    policy: {},
    connection: {
      state: "connected",
      grantedScopes: [BUSINESS_PROFILE_SCOPE],
      missingScopes: [],
      authMethod: "oauth",
    },
    discovery: {
      accounts: [],
      locations: [],
      lastSyncedAt: null,
      rateLimitedUntil: null,
      lastError: null,
    },
    schemaVersion: 1,
    migrationVersion: 1,
  };
  const ctx = buildContext({
    platform: state,
    legacyIntegrations: { google: { bearerToken: "token", enabled: true } },
  });
  const originalFetch = globalThis.fetch;
  let fetches = 0;
  globalThis.fetch = (async () => {
    fetches += 1;
    throw new Error("unexpected fetch");
  }) as typeof fetch;

  try {
    const { result } = await validateGoogleIntegration(state, ctx, "business_profile");
    assert.equal(result.ok, true);
    assert.equal(fetches, 0);
    assert.match(result.message, /credentials and scopes present/i);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("business profile is configured from OAuth scope without businessAccountId", async () => {
  const { emptyPlatformState, BUSINESS_PROFILE_SCOPE, buildContext, googleIntegrationRegistry } =
    await loadModules();
  const state = emptyPlatformState();
  state.services.business_profile = {
    configuration: {},
    policy: {},
    connection: {
      state: "connected",
      grantedScopes: [BUSINESS_PROFILE_SCOPE],
      missingScopes: [],
      authMethod: "oauth",
    },
    schemaVersion: 1,
    migrationVersion: 1,
  };
  const ctx = buildContext({
    platform: state,
    legacyIntegrations: { google: { bearerToken: "token", enabled: true } },
  });
  assert.equal(googleIntegrationRegistry.require("business_profile").isConfigured(ctx), true);
  assert.equal(googleIntegrationRegistry.require("business_profile").resolveConnection(ctx).state, "connected");
});

test("OAuth post-sync 403 persists lastError and leaves connection connected", async () => {
  const {
    emptyPlatformState,
    BUSINESS_PROFILE_SCOPE,
    setBusinessProfileRuntimeForTests,
    syncBusinessProfileAfterOAuth,
  } = await loadModules();
  const now = Date.parse("2026-09-03T12:00:00.000Z");
  let state = emptyPlatformState();
  state.services.business_profile = {
    configuration: {},
    policy: {},
    connection: {
      state: "connected",
      grantedScopes: [BUSINESS_PROFILE_SCOPE],
      missingScopes: [],
      authMethod: "oauth",
    },
    schemaVersion: 1,
    migrationVersion: 1,
  };
  const enableUrl =
    "https://console.developers.google.com/apis/api/mybusinessaccountmanagement.googleapis.com/overview?project=123";
  setBusinessProfileRuntimeForTests({
    now: () => now,
    sleep: async () => {},
    fetch: async () =>
      jsonResponse(403, {
        error: {
          message: `My Business Account Management API has not been used in project 123 before or it is disabled. Enable it by visiting ${enableUrl}`,
        },
      }),
    loadState: async () => state,
    saveState: async (next) => {
      state = next;
    },
    resolveToken: async () => "token",
  });

  const result = await syncBusinessProfileAfterOAuth();
  assert.equal(result, null);
  const discovery = state.services.business_profile?.discovery;
  assert.ok(discovery);
  assert.equal(discovery.lastSyncedAt, null);
  assert.match(discovery.lastError ?? "", /not enabled/i);
  assert.ok(discovery.lastError?.includes(enableUrl));
  assert.equal(state.services.business_profile?.connection?.state, "connected");
  setBusinessProfileRuntimeForTests(null);
});

test("bootstrapBusinessProfileDiscoveryIfNeeded fetches when lastSyncedAt is null", async () => {
  const {
    emptyPlatformState,
    BUSINESS_PROFILE_SCOPE,
    setBusinessProfileRuntimeForTests,
    bootstrapBusinessProfileDiscoveryIfNeeded,
  } = await loadModules();
  const now = Date.parse("2026-09-03T12:00:00.000Z");
  let state = emptyPlatformState();
  state.services.business_profile = {
    configuration: {},
    policy: {},
    connection: {
      state: "connected",
      grantedScopes: [BUSINESS_PROFILE_SCOPE],
      missingScopes: [],
      authMethod: "oauth",
    },
    discovery: {
      accounts: [],
      locations: [],
      lastSyncedAt: null,
      rateLimitedUntil: null,
      lastError: null,
    },
    schemaVersion: 1,
    migrationVersion: 1,
  };
  let fetches = 0;
  setBusinessProfileRuntimeForTests({
    now: () => now,
    sleep: async () => {},
    fetch: async () => {
      fetches += 1;
      return jsonResponse(200, {
        accounts: [{ name: "accounts/1", accountName: "BRT" }],
      });
    },
    loadState: async () => state,
    saveState: async (next) => {
      state = next;
    },
    resolveToken: async () => "token",
  });

  const first = await bootstrapBusinessProfileDiscoveryIfNeeded();
  assert.ok(first);
  assert.equal(first.ok, true);
  assert.ok(fetches >= 1);
  const fetchesAfterFirst = fetches;

  const second = await bootstrapBusinessProfileDiscoveryIfNeeded();
  assert.equal(second, null);
  assert.equal(fetches, fetchesAfterFirst);
  setBusinessProfileRuntimeForTests(null);
});

test("validate returns sync failed when lastError set without lastSyncedAt", async () => {
  const {
    emptyPlatformState,
    BUSINESS_PROFILE_SCOPE,
    buildContext,
    validateGoogleIntegration,
  } = await loadModules();
  const state = emptyPlatformState();
  state.services.business_profile = {
    configuration: {},
    policy: {},
    connection: {
      state: "connected",
      grantedScopes: [BUSINESS_PROFILE_SCOPE],
      missingScopes: [],
      authMethod: "oauth",
    },
    discovery: {
      accounts: [],
      locations: [],
      lastSyncedAt: null,
      rateLimitedUntil: null,
      lastError: "Business Profile Account Management API is not enabled for Google Cloud project 123.",
    },
    schemaVersion: 1,
    migrationVersion: 1,
  };
  const ctx = buildContext({
    platform: state,
    legacyIntegrations: { google: { bearerToken: "token", enabled: true } },
  });
  const originalFetch = globalThis.fetch;
  let fetches = 0;
  globalThis.fetch = (async () => {
    fetches += 1;
    throw new Error("unexpected fetch");
  }) as typeof fetch;

  try {
    const { result } = await validateGoogleIntegration(state, ctx, "business_profile");
    assert.equal(result.ok, false);
    assert.equal(fetches, 0);
    assert.match(result.message, /sync failed/i);
    assert.match(result.message, /not enabled/i);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("validate treats rate-limit lastError as ok warning not failure", async () => {
  const {
    emptyPlatformState,
    BUSINESS_PROFILE_SCOPE,
    BUSINESS_PROFILE_RATE_LIMITED_MESSAGE,
    buildContext,
    validateGoogleIntegration,
  } = await loadModules();
  const now = Date.now();
  const state = emptyPlatformState();
  state.services.business_profile = {
    configuration: {},
    policy: {},
    connection: {
      state: "connected",
      grantedScopes: [BUSINESS_PROFILE_SCOPE],
      missingScopes: [],
      authMethod: "oauth",
    },
    discovery: {
      accounts: [],
      locations: [],
      lastSyncedAt: null,
      // Active cooldown so normalize keeps the rate-limit lastError.
      rateLimitedUntil: new Date(now + 15 * 60_000).toISOString(),
      lastError: BUSINESS_PROFILE_RATE_LIMITED_MESSAGE,
    },
    schemaVersion: 1,
    migrationVersion: 1,
  };
  const ctx = buildContext({
    platform: state,
    legacyIntegrations: { google: { bearerToken: "token", enabled: true } },
  });
  const { result } = await validateGoogleIntegration(state, ctx, "business_profile");
  assert.equal(result.ok, true);
  assert.match(result.message, /rate-limited/i);
  assert.ok(result.warnings?.length);
  assert.doesNotMatch(result.message, /sync failed/i);
});

test("monitoringFor while rate-limited reports warnings not errors", async () => {
  const {
    emptyPlatformState,
    BUSINESS_PROFILE_SCOPE,
    BUSINESS_PROFILE_RATE_LIMITED_MESSAGE,
    buildContext,
    googleIntegrationRegistry,
  } = await loadModules();
  const now = Date.now();
  const state = emptyPlatformState();
  state.services.business_profile = {
    configuration: {},
    policy: {},
    connection: {
      state: "connected",
      grantedScopes: [BUSINESS_PROFILE_SCOPE],
      missingScopes: [],
      authMethod: "oauth",
    },
    monitoring: {
      errors: 1,
      warnings: 0,
      runningJobs: 0,
      pendingJobs: 0,
    },
    discovery: {
      accounts: [],
      locations: [],
      lastSyncedAt: null,
      rateLimitedUntil: new Date(now + 15 * 60_000).toISOString(),
      lastError: BUSINESS_PROFILE_RATE_LIMITED_MESSAGE,
    },
    schemaVersion: 1,
    migrationVersion: 1,
  };
  const ctx = buildContext({
    platform: state,
    legacyIntegrations: { google: { bearerToken: "token", enabled: true } },
  });
  const monitoring = await googleIntegrationRegistry.monitoringFor("business_profile", ctx);
  assert.equal(monitoring.errors, 0);
  assert.ok(monitoring.warnings >= 1);
});

test("expired rate-limit discovery clears cooldown and lastError on read", async () => {
  const {
    emptyPlatformState,
    BUSINESS_PROFILE_SCOPE,
    BUSINESS_PROFILE_RATE_LIMITED_MESSAGE,
    readBusinessProfileDiscovery,
    isBusinessProfileRateLimited,
    buildContext,
    validateGoogleIntegration,
  } = await loadModules();
  const now = Date.parse("2026-09-03T12:00:00.000Z");
  const state = emptyPlatformState();
  state.services.business_profile = {
    configuration: {},
    policy: {},
    connection: {
      state: "connected",
      grantedScopes: [BUSINESS_PROFILE_SCOPE],
      missingScopes: [],
      authMethod: "oauth",
    },
    discovery: {
      accounts: [],
      locations: [],
      lastSyncedAt: null,
      rateLimitedUntil: new Date(now - 60_000).toISOString(),
      lastError: BUSINESS_PROFILE_RATE_LIMITED_MESSAGE,
    },
    schemaVersion: 1,
    migrationVersion: 1,
  };

  const discovery = readBusinessProfileDiscovery(state, now);
  assert.equal(discovery.rateLimitedUntil, null);
  assert.equal(discovery.lastError, null);
  assert.equal(isBusinessProfileRateLimited(discovery, now), false);
  assert.equal(discovery.lastSyncedAt, null);

  const ctx = buildContext({
    platform: state,
    legacyIntegrations: { google: { bearerToken: "token", enabled: true } },
  });
  const { result } = await validateGoogleIntegration(state, ctx, "business_profile");
  assert.equal(result.ok, true);
  assert.doesNotMatch(result.message, /sync failed/i);
  assert.match(result.message, /has not completed yet/i);
});

test("active rate-limit discovery keeps cooldown and blocks sync", async () => {
  const {
    emptyPlatformState,
    BUSINESS_PROFILE_SCOPE,
    BUSINESS_PROFILE_RATE_LIMITED_MESSAGE,
    readBusinessProfileDiscovery,
    isBusinessProfileRateLimited,
    setBusinessProfileRuntimeForTests,
    syncBusinessProfileLocations,
  } = await loadModules();
  const now = Date.parse("2026-09-03T12:00:00.000Z");
  let state = emptyPlatformState();
  state.services.business_profile = {
    configuration: {},
    policy: {},
    connection: {
      state: "connected",
      grantedScopes: [BUSINESS_PROFILE_SCOPE],
      missingScopes: [],
      authMethod: "oauth",
    },
    discovery: {
      accounts: [],
      locations: [],
      lastSyncedAt: null,
      rateLimitedUntil: new Date(now + 15 * 60_000).toISOString(),
      lastError: BUSINESS_PROFILE_RATE_LIMITED_MESSAGE,
    },
    schemaVersion: 1,
    migrationVersion: 1,
  };

  const discovery = readBusinessProfileDiscovery(state, now);
  assert.ok(discovery.rateLimitedUntil);
  assert.equal(discovery.lastError, BUSINESS_PROFILE_RATE_LIMITED_MESSAGE);
  assert.equal(isBusinessProfileRateLimited(discovery, now), true);

  let fetches = 0;
  setBusinessProfileRuntimeForTests({
    now: () => now,
    sleep: async () => {},
    fetch: async () => {
      fetches += 1;
      return jsonResponse(200, { accounts: [] });
    },
    loadState: async () => state,
    saveState: async (next) => {
      state = next;
    },
    resolveToken: async () => "token",
  });

  const result = await syncBusinessProfileLocations({ force: true });
  assert.equal(result.ok, false);
  assert.equal(fetches, 0);
  assert.match(result.message, /rate-limited/i);
  setBusinessProfileRuntimeForTests(null);
});

test("sync persists cleared expired rate-limit fields", async () => {
  const {
    emptyPlatformState,
    BUSINESS_PROFILE_SCOPE,
    BUSINESS_PROFILE_RATE_LIMITED_MESSAGE,
    setBusinessProfileRuntimeForTests,
    syncBusinessProfileLocations,
  } = await loadModules();
  const now = Date.parse("2026-09-03T12:00:00.000Z");
  let state = emptyPlatformState();
  state.services.business_profile = {
    configuration: {},
    policy: {},
    connection: {
      state: "connected",
      grantedScopes: [BUSINESS_PROFILE_SCOPE],
      missingScopes: [],
      authMethod: "oauth",
    },
    discovery: {
      accounts: [],
      locations: [],
      lastSyncedAt: null,
      rateLimitedUntil: new Date(now - 1).toISOString(),
      lastError: BUSINESS_PROFILE_RATE_LIMITED_MESSAGE,
    },
    schemaVersion: 1,
    migrationVersion: 1,
  };
  let fetches = 0;
  setBusinessProfileRuntimeForTests({
    now: () => now,
    sleep: async () => {},
    fetch: async () => {
      fetches += 1;
      return jsonResponse(200, { accounts: [] });
    },
    loadState: async () => state,
    saveState: async (next) => {
      state = next;
    },
    resolveToken: async () => "token",
  });

  const result = await syncBusinessProfileLocations({ force: true });
  assert.equal(result.ok, true);
  assert.ok(fetches >= 1);
  assert.equal(state.services.business_profile?.discovery?.rateLimitedUntil, null);
  assert.equal(state.services.business_profile?.discovery?.lastError, null);
  assert.ok(state.services.business_profile?.discovery?.lastSyncedAt);
  setBusinessProfileRuntimeForTests(null);
});

test("isBusinessProfileRateLimitError recognizes quota message", async () => {
  const { BUSINESS_PROFILE_RATE_LIMITED_MESSAGE, isBusinessProfileRateLimitError } = await loadModules();
  assert.equal(isBusinessProfileRateLimitError(BUSINESS_PROFILE_RATE_LIMITED_MESSAGE), true);
  assert.equal(isBusinessProfileRateLimitError("temporarily rate-limited by Google"), true);
  assert.equal(isBusinessProfileRateLimitError("API is not enabled for project 123"), false);
  assert.equal(isBusinessProfileRateLimitError(null), false);
});

test("clearExpiredBusinessProfileRateLimitIfNeeded clears sticky monitoring.errors", async () => {
  const {
    emptyPlatformState,
    BUSINESS_PROFILE_SCOPE,
    BUSINESS_PROFILE_RATE_LIMITED_MESSAGE,
    setBusinessProfileRuntimeForTests,
    clearExpiredBusinessProfileRateLimitIfNeeded,
    buildContext,
    googleIntegrationRegistry,
  } = await loadModules();
  const now = Date.parse("2026-09-03T12:00:00.000Z");
  let state = emptyPlatformState();
  state.services.business_profile = {
    configuration: {},
    policy: {},
    connection: {
      state: "connected",
      grantedScopes: [BUSINESS_PROFILE_SCOPE],
      missingScopes: [],
      authMethod: "oauth",
      message: BUSINESS_PROFILE_RATE_LIMITED_MESSAGE,
    },
    monitoring: {
      errors: 1,
      warnings: 0,
      runningJobs: 0,
      pendingJobs: 0,
    },
    discovery: {
      accounts: [],
      locations: [],
      lastSyncedAt: null,
      rateLimitedUntil: new Date(now - 60_000).toISOString(),
      lastError: BUSINESS_PROFILE_RATE_LIMITED_MESSAGE,
    },
    schemaVersion: 1,
    migrationVersion: 1,
  };
  setBusinessProfileRuntimeForTests({
    now: () => now,
    sleep: async () => {},
    fetch: async () => jsonResponse(200, { accounts: [] }),
    loadState: async () => state,
    saveState: async (next) => {
      state = next;
    },
    resolveToken: async () => "token",
  });

  const cleared = await clearExpiredBusinessProfileRateLimitIfNeeded();
  assert.equal(cleared, true);
  assert.equal(state.services.business_profile?.discovery?.rateLimitedUntil, null);
  assert.equal(state.services.business_profile?.discovery?.lastError, null);
  assert.equal(state.services.business_profile?.monitoring?.errors, 0);
  assert.equal(state.services.business_profile?.connection?.message, "Connected");

  const ctx = buildContext({
    platform: state,
    legacyIntegrations: { google: { bearerToken: "token", enabled: true } },
  });
  const monitoring = await googleIntegrationRegistry.monitoringFor("business_profile", ctx);
  assert.equal(monitoring.errors, 0);
  setBusinessProfileRuntimeForTests(null);
});
