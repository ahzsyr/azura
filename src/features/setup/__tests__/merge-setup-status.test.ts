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
