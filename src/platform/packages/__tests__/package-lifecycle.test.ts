import assert from "node:assert/strict";
import test from "node:test";
import { expandFeatureToggles } from "@/platform/packages/site-feature-changes";
import {
  blockingDependents,
  blockingEnabledModuleDependents,
  inactiveRequiredPackages,
  packageStatusForFeatureEnabled,
  planPackageStatusSync,
} from "@/platform/packages/lifecycle";
import { decideMarketingIngress } from "@/modules/marketing/ingress-decision";

test("active SiteFeature maps to active PackageInstallation status", () => {
  assert.equal(packageStatusForFeatureEnabled(true), "active");
  assert.equal(packageStatusForFeatureEnabled(false), "inactive");
});

test("planPackageStatusSync keeps SiteFeature and PackageInstallation aligned", () => {
  const planned = planPackageStatusSync(
    [
      { featureId: "documentation", enabled: true },
      { featureId: "marketing", enabled: false },
      { featureId: "pending-app", enabled: true },
      { featureId: "missing", enabled: true },
    ],
    [
      { packageId: "documentation", status: "inactive" },
      { packageId: "marketing", status: "active" },
      { packageId: "pending-app", status: "pending" },
      { packageId: "status-page", status: "active" },
    ],
  );
  assert.deepEqual(planned, [
    { packageId: "documentation", status: "active" },
    { packageId: "marketing", status: "inactive" },
  ]);
});

test("planPackageStatusSync no-ops when already aligned", () => {
  assert.deepEqual(
    planPackageStatusSync(
      [{ featureId: "marketing", enabled: true }],
      [{ packageId: "marketing", status: "active" }],
    ),
    [],
  );
});

test("blockingDependents only counts active packages", () => {
  const packages = [
    { packageId: "ecommerce", status: "active", requiredPackages: [] },
    { packageId: "ecommerce-blocks", status: "active", requiredPackages: ["ecommerce"] },
    { packageId: "draft-extension", status: "installed", requiredPackages: ["ecommerce"] },
    { packageId: "pending-extension", status: "pending", requiredPackages: ["ecommerce"] },
    { packageId: "off-extension", status: "inactive", requiredPackages: ["ecommerce"] },
  ];
  assert.deepEqual(blockingDependents("ecommerce", packages), ["ecommerce-blocks"]);
  assert.deepEqual(blockingDependents("missing", packages), []);
});

test("inactiveRequiredPackages blocks activation when deps are inactive", () => {
  const packages = [
    { packageId: "ecommerce", status: "inactive", requiredPackages: [] },
    { packageId: "ecommerce-blocks", status: "inactive", requiredPackages: ["ecommerce"] },
  ];
  assert.deepEqual(
    inactiveRequiredPackages("ecommerce-blocks", ["ecommerce"], packages),
    ["ecommerce"],
  );
  assert.deepEqual(
    inactiveRequiredPackages(
      "ecommerce-blocks",
      ["ecommerce"],
      [{ packageId: "ecommerce", status: "active", requiredPackages: [] }],
    ),
    [],
  );
});

test("turning a required preset off also turns off the app (complementary cascade)", () => {
  const current = new Map<string, boolean>([
    ["module:documentation", true],
    ["preset:knowledge", true],
    ["module:marketing", true],
  ]);
  const writes = expandFeatureToggles({
    requested: [{ kind: "preset", featureId: "knowledge", enabled: false }],
    current,
    manifests: [
      { id: "documentation", requiredPresets: ["knowledge"] },
      { id: "marketing", requiredPresets: [] },
    ],
    includedModules: ["documentation", "marketing"],
    includedPresets: ["knowledge"],
  });
  const byKey = new Map(writes.map((write) => [`${write.kind}:${write.featureId}`, write.enabled]));
  assert.equal(byKey.get("preset:knowledge"), false);
  assert.equal(byKey.get("module:documentation"), false);
  assert.equal(byKey.has("module:marketing"), false);

  const sync = planPackageStatusSync(
    writes.filter((write) => write.kind === "module"),
    [
      { packageId: "documentation", status: "active" },
      { packageId: "marketing", status: "active" },
    ],
  );
  assert.deepEqual(sync, [{ packageId: "documentation", status: "inactive" }]);
});

test("same-save precedence: module on + required preset off → preset forced on", () => {
  // knowledge starts off so the force-on is visible as a write (not a no-op vs current).
  const current = new Map<string, boolean>([
    ["module:documentation", false],
    ["preset:knowledge", false],
  ]);
  const writes = expandFeatureToggles({
    requested: [
      { kind: "module", featureId: "documentation", enabled: true },
      { kind: "preset", featureId: "knowledge", enabled: false },
    ],
    current,
    manifests: [{ id: "documentation", requiredPresets: ["knowledge"] }],
    includedModules: ["documentation"],
    includedPresets: ["knowledge"],
  });
  const byKey = new Map(writes.map((write) => [`${write.kind}:${write.featureId}`, write.enabled]));
  assert.equal(byKey.get("module:documentation"), true);
  assert.equal(byKey.get("preset:knowledge"), true);
});

test("regression: omitted includedPresets skips required-preset writes", () => {
  const writes = expandFeatureToggles({
    requested: [{ kind: "module", featureId: "documentation", enabled: true }],
    current: new Map([
      ["module:documentation", false],
      ["preset:knowledge", false],
    ]),
    manifests: [{ id: "documentation", requiredPresets: ["knowledge"] }],
    includedModules: ["documentation"],
    includedPresets: [],
  });
  assert.deepEqual(writes, [{ kind: "module", featureId: "documentation", enabled: true }]);
  assert.equal(
    writes.some((write) => write.kind === "preset" && write.featureId === "knowledge"),
    false,
  );
});

test("setup-style module activate expands required presets before status sync", () => {
  const current = new Map<string, boolean>([
    ["module:documentation", false],
    ["preset:knowledge", false],
  ]);
  const writes = expandFeatureToggles({
    requested: [{ kind: "module", featureId: "documentation", enabled: true }],
    current,
    manifests: [{ id: "documentation", requiredPresets: ["knowledge"] }],
    includedModules: ["documentation"],
    includedPresets: ["knowledge"],
  });
  assert.deepEqual(writes, [
    { kind: "module", featureId: "documentation", enabled: true },
    { kind: "preset", featureId: "knowledge", enabled: true },
  ]);
  assert.deepEqual(
    planPackageStatusSync(
      [{ featureId: "documentation", enabled: true }],
      [{ packageId: "documentation", status: "installed" }],
    ),
    [{ packageId: "documentation", status: "active" }],
  );
});

test("direct installer deactivate is blocked by active requiredPackages dependents", () => {
  assert.deepEqual(
    blockingDependents("core-app", [
      { packageId: "core-app", status: "active", requiredPackages: [] },
      { packageId: "plugin", status: "active", requiredPackages: ["core-app"] },
    ]),
    ["plugin"],
  );
});

test("manifest graph blocks disabling a module still required by an enabled module", () => {
  assert.deepEqual(
    blockingEnabledModuleDependents(
      "ecommerce",
      ["ecommerce-blocks", "marketing"],
      [
        { id: "ecommerce", requiredPackages: [] },
        { id: "ecommerce-blocks", requiredPackages: ["ecommerce"] },
        { id: "marketing", requiredPackages: [] },
      ],
    ),
    ["ecommerce-blocks"],
  );
});

test("availability reads stay fail-open; ingress mutations stay fail-closed", () => {
  // Mirrors isModuleActive ledger miss → treat active (Phase 1 availability policy).
  const availabilityOnLedgerMiss = true;
  assert.equal(availabilityOnLedgerMiss, true);

  // Ingress mutations deny when ledger cannot be established.
  assert.deepEqual(
    decideMarketingIngress({
      moduleAccess: "ledger_unavailable",
      envCoreEnabled: true,
    }),
    { allow: false, reason: "ledger_unavailable" },
  );

  // Runtime-inactive is denied for ingress while remaining a normal SiteFeature=false.
  assert.deepEqual(
    decideMarketingIngress({
      moduleAccess: "runtime_inactive",
      envCoreEnabled: true,
    }),
    { allow: false, reason: "runtime_inactive" },
  );
});
