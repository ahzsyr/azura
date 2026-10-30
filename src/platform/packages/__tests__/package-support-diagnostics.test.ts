import assert from "node:assert/strict";
import test from "node:test";
import {
  assertSupportDiagnosticsShape,
  buildSupportDiagnosticsSnapshot,
  isSupportDiagnosticsShape,
  SUPPORT_DIAGNOSTICS_SCHEMA_VERSION,
} from "@/platform/packages/package-support-diagnostics";

test("buildSupportDiagnosticsSnapshot produces a valid shape without secrets", () => {
  const snap = buildSupportDiagnosticsSnapshot({
    generatedAt: "2026-01-01T00:00:00.000Z",
    profile: {
      profileId: "enterprise",
      profileSourceHash: "hash",
      generated: true,
    },
    packages: [
      {
        packageId: "documentation",
        kind: "app",
        status: "active",
        version: "1.0.0",
        azuraCompatibility: ">=0.1.0",
        appliedUps: 2,
        pendingUpCount: 1,
        lastLifecycleFailure: {
          action: "package.activate.fail",
          reason: "documentation requires knowledge to be active",
          createdAt: "2026-01-01T00:00:00.000Z",
        },
        moduleIncludedInProfile: true,
      },
    ],
    coreVersion: "0.1.0",
  });

  assert.equal(snap.schemaVersion, SUPPORT_DIAGNOSTICS_SCHEMA_VERSION);
  assert.equal(snap.secretsExcluded, true);
  assert.equal(snap.packages[0]?.compatibleWithCore, true);
  assert.match(snap.packages[0]?.recoveryHint ?? "", /Enable the required packages/i);
  assertSupportDiagnosticsShape(snap);
});

test("assertSupportDiagnosticsShape rejects settings/secrets fields", () => {
  const bad = {
    schemaVersion: 1,
    generatedAt: "2026-01-01T00:00:00.000Z",
    profile: { profileId: "agency", profileSourceHash: null, generated: true },
    packages: [
      {
        packageId: "marketing",
        kind: "app",
        status: "active",
        version: "1.0.0",
        azuraCompatibility: ">=0.1.0",
        compatibleWithCore: true,
        coreVersion: "0.1.0",
        migrations: { appliedUps: 0, pendingUpCount: 0 },
        lastLifecycleFailure: null,
        recoveryHint: null,
        moduleIncludedInProfile: false,
        secrets: { apiKey: "nope" },
      },
    ],
    secretsExcluded: true,
  };
  assert.equal(isSupportDiagnosticsShape(bad), false);
  assert.throws(() => assertSupportDiagnosticsShape(bad), /secrets/);
});

test("redacts secret-looking failure reasons", () => {
  const snap = buildSupportDiagnosticsSnapshot({
    profile: { profileId: null, profileSourceHash: null, generated: false },
    packages: [
      {
        packageId: "x",
        lastLifecycleFailure: {
          action: "package.update.fail",
          reason: "token leaked: abc",
          createdAt: "2026-01-01T00:00:00.000Z",
        },
      },
    ],
  });
  assert.equal(snap.packages[0]?.lastLifecycleFailure?.reason, "[redacted]");
});
