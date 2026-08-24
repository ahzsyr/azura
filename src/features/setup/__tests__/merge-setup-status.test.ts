import { afterEach, test } from "node:test";
import assert from "node:assert/strict";
import {
  mergeSetupStatusWithEnvOverrides,
  setupStatusFromCookieFallback,
  statusFromEnvFallback,
} from "@/features/setup/merge-setup-status";
import { invalidateSetupStatusCache } from "@/features/setup/setup-middleware-cache";

const ENV_KEYS = ["COMING_SOON_ENABLED", "SETUP_COMPLETE"] as const;

function clearEnv() {
  for (const key of ENV_KEYS) {
    delete process.env[key];
  }
}

afterEach(() => {
  clearEnv();
  invalidateSetupStatusCache();
});

test("mergeSetupStatusWithEnvOverrides uses DB coming soon when fromApi is true", () => {
  process.env.COMING_SOON_ENABLED = "false";

  const merged = mergeSetupStatusWithEnvOverrides(
    {
      setupComplete: true,
      registrationEnabled: true,
      comingSoonEnabled: true,
      confident: true,
    },
    { fromApi: true },
  );

  assert.equal(merged.comingSoonEnabled, true);
});

test("mergeSetupStatusWithEnvOverrides does not let env force coming soon when API says live", () => {
  process.env.COMING_SOON_ENABLED = "true";

  const merged = mergeSetupStatusWithEnvOverrides(
    {
      setupComplete: true,
      registrationEnabled: true,
      comingSoonEnabled: false,
      confident: true,
    },
    { fromApi: true },
  );

  assert.equal(merged.comingSoonEnabled, false);
});

test("mergeSetupStatusWithEnvOverrides uses env coming soon when API unavailable", () => {
  process.env.COMING_SOON_ENABLED = "true";

  const merged = mergeSetupStatusWithEnvOverrides({
    setupComplete: true,
    registrationEnabled: true,
    comingSoonEnabled: false,
    confident: false,
  });

  assert.equal(merged.comingSoonEnabled, true);
});

test("mergeSetupStatusWithEnvOverrides ignores stale coming soon when API unavailable", () => {
  const merged = mergeSetupStatusWithEnvOverrides({
    setupComplete: true,
    registrationEnabled: true,
    comingSoonEnabled: true,
    confident: true,
  });

  assert.equal(merged.comingSoonEnabled, false);
});

test("non-API merge uses a short cache so Live recovers after a status fetch failure", () => {
  const merged = mergeSetupStatusWithEnvOverrides({
    setupComplete: true,
    registrationEnabled: true,
    comingSoonEnabled: false,
    confident: true,
  });

  const ttl = merged.expires - Date.now();
  assert.ok(ttl <= 30_000 + 100);
  assert.ok(ttl > 0);
});

test("API merge caches a live complete status longer than fallback", () => {
  const merged = mergeSetupStatusWithEnvOverrides(
    {
      setupComplete: true,
      registrationEnabled: true,
      comingSoonEnabled: false,
      confident: true,
    },
    { fromApi: true },
  );

  const ttl = merged.expires - Date.now();
  assert.ok(ttl > 60_000);
});

test("statusFromEnvFallback returns null when no env overrides are set", () => {
  assert.equal(statusFromEnvFallback(), null);
});

test("statusFromEnvFallback uses SETUP_COMPLETE env for setup only", () => {
  process.env.SETUP_COMPLETE = "true";

  const fallback = statusFromEnvFallback();
  assert.ok(fallback);
  assert.equal(fallback.setupComplete, true);
  assert.equal(fallback.comingSoonEnabled, false);
});

test("SETUP_COMPLETE=false does not force incomplete over DB complete", () => {
  process.env.SETUP_COMPLETE = "false";

  const merged = mergeSetupStatusWithEnvOverrides(
    {
      setupComplete: true,
      registrationEnabled: true,
      comingSoonEnabled: false,
      confident: true,
    },
    { fromApi: true },
  );

  assert.equal(merged.setupComplete, true);
  assert.equal(statusFromEnvFallback(), null);
});

test("setupStatusFromCookieFallback does not force coming soon off", () => {
  const fallback = setupStatusFromCookieFallback();
  assert.equal(fallback.setupComplete, true);
  assert.equal(fallback.comingSoonEnabled, false);
  assert.equal(fallback.confident, false);
});

test("setupStatusFromCookieFallback uses COMING_SOON_ENABLED env when API unavailable", () => {
  process.env.COMING_SOON_ENABLED = "true";

  const fallback = setupStatusFromCookieFallback();
  assert.equal(fallback.comingSoonEnabled, true);
  assert.equal(fallback.confident, true);
});
