import assert from "node:assert/strict";
import test from "node:test";
import { evaluatePackagePreflight } from "@/platform/packages/package-preflight-core";
import type { PackageManifest } from "@/platform/packages/manifest";

function baseManifest(overrides: Partial<PackageManifest> = {}): PackageManifest {
  return {
    id: "demo-app",
    version: "1.0.0",
    kind: "app",
    label: "Demo",
    azuraCompatibility: ">=0.1.0",
    requiredPackages: [],
    requiredCapabilities: [],
    requiredPresets: [],
    permissions: [],
    contributions: {
      adminNavItemIds: [],
      adminRoutePrefixes: [],
      blockTypes: [],
    },
    ...overrides,
  };
}

test("preflight blocks activate when required package is inactive", () => {
  const result = evaluatePackagePreflight({
    packageId: "demo-app",
    operation: "activate",
    profileGenerated: true,
    moduleIncluded: true,
    isBuiltin: true,
    status: "inactive",
    manifest: baseManifest({ requiredPackages: ["docs"] }),
    deps: [{ packageId: "docs", status: "inactive", requiredPackages: [] }],
    migrations: { appliedUps: 0, pendingUpFilenames: [] },
  });
  assert.equal(result.ok, false);
  assert.ok(result.blockers.some((b) => b.code === "deps_inactive"));
  assert.ok(result.recoveryHints.some((h) => /Enable the required packages/i.test(h)));
});

test("preflight blocks activate for pending packages", () => {
  const result = evaluatePackagePreflight({
    packageId: "custom-ext",
    operation: "activate",
    profileGenerated: true,
    moduleIncluded: false,
    isBuiltin: false,
    status: "pending",
    manifest: baseManifest({ id: "custom-ext" }),
    deps: [],
    migrations: { appliedUps: 0, pendingUpFilenames: [] },
  });
  assert.equal(result.ok, false);
  assert.ok(result.blockers.some((b) => b.code === "pending"));
});

test("preflight blocks update when builtin is profile-omitted", () => {
  const result = evaluatePackagePreflight({
    packageId: "marketing",
    operation: "update",
    profileGenerated: true,
    moduleIncluded: false,
    isBuiltin: true,
    status: "inactive",
    manifest: baseManifest({ id: "marketing" }),
    deps: [],
    migrations: { appliedUps: 0, pendingUpFilenames: [] },
  });
  assert.equal(result.ok, false);
  assert.ok(result.blockers.some((b) => b.code === "profile_omitted"));
  assert.ok(result.profileNotes.length > 0);
});

test("preflight warns on pending migrations for activate", () => {
  const result = evaluatePackagePreflight({
    packageId: "demo-app",
    operation: "activate",
    profileGenerated: true,
    moduleIncluded: true,
    isBuiltin: true,
    status: "inactive",
    manifest: baseManifest(),
    deps: [],
    migrations: { appliedUps: 1, pendingUpFilenames: ["002.up.sql"] },
  });
  assert.equal(result.ok, true);
  assert.ok(result.warnings.some((w) => w.code === "migrations_pending"));
});
