import assert from "node:assert/strict";
import test from "node:test";
import { documentationModuleManifest } from "@/modules/documentation/manifest";
import { marketingModuleManifest } from "@/modules/marketing/manifest";
import { statusPageModuleManifest } from "@/modules/status-page/manifest";
import { advancedSeoModuleManifest } from "@/modules/advanced-seo/manifest";
import {
  isCompatibleWithCore,
  packageManifestFromModule,
  validatePackageManifest,
  validateZipEntryName,
} from "@/platform/packages/manifest";
import { expandFeatureToggles } from "@/platform/packages/site-feature-changes";
import { readStoreZip, writeStoreZip } from "@/platform/packages/zip-store";

test("module manifests become app packages with operational contributions only", () => {
  const manifest = packageManifestFromModule(documentationModuleManifest);
  assert.equal(manifest.kind, "app");
  assert.deepEqual(manifest.contributions.adminNavItemIds, ["documentation"]);
  assert.deepEqual(manifest.contributions.blockTypes, ["documentationNav"]);
  assert.deepEqual(manifest.contributions.adminRoutePrefixes, ["/admin/documentation"]);
  assert.equal("publicRoutePrefixes" in manifest.contributions, false);
  assert.equal("dashboardSections" in manifest.contributions, false);
});

test("packageManifestFromModule projects admin routes; public routes stay on ModuleManifest", () => {
  const marketing = packageManifestFromModule(marketingModuleManifest);
  assert.deepEqual(marketing.contributions.adminRoutePrefixes, ["/admin/marketing"]);
  assert.ok(marketingModuleManifest.publicRoutes.some((r) => r.startsWith("/api/")));

  const status = packageManifestFromModule(statusPageModuleManifest);
  assert.deepEqual(status.contributions.adminRoutePrefixes, ["/admin/status"]);
  assert.ok(statusPageModuleManifest.publicRoutes.includes("/status"));
});

test("app permissions are registered ACL keys; extensions cannot declare Module ACL", () => {
  const packaged = packageManifestFromModule(documentationModuleManifest);
  assert.deepEqual(packaged.permissions, ["documentation.read", "documentation.manage"]);
  const validated = validatePackageManifest(packaged);
  assert.equal(validated.ok, true);

  const badApp = validatePackageManifest({
    id: "documentation",
    version: "1.0.0",
    kind: "app",
    permissions: ["documentation.read", "custom.permission"],
  });
  assert.equal(badApp.ok, false);

  const extensionWithPerms = validatePackageManifest({
    id: "docs-ext",
    version: "1.0.0",
    kind: "extension",
    permissions: ["documentation.read"],
  });
  assert.equal(extensionWithPerms.ok, false);
});

test("builtin module manifests round-trip through validatePackageManifest", () => {
  for (const moduleManifest of [
    documentationModuleManifest,
    statusPageModuleManifest,
    marketingModuleManifest,
    advancedSeoModuleManifest,
  ]) {
    const packaged = packageManifestFromModule(moduleManifest);
    const validated = validatePackageManifest(packaged);
    assert.equal(validated.ok, true, moduleManifest.id);
    if (validated.ok) {
      assert.equal(validated.manifest.id, moduleManifest.id);
      assert.equal(validated.manifest.kind, "app");
      assert.deepEqual(validated.manifest.requiredPackages, moduleManifest.requiredPackages);
      assert.deepEqual(
        validated.manifest.requiredCapabilities,
        moduleManifest.requiredCapabilities,
      );
      assert.deepEqual(validated.manifest.requiredPresets, moduleManifest.requiredPresets);
      assert.deepEqual(
        validated.manifest.contributions.adminRoutePrefixes,
        moduleManifest.adminRoutes,
      );
    }
  }
});

test("package manifest validation accepts apps, extensions, and themes", () => {
  const extension = validatePackageManifest({
    id: "ecommerce-blocks",
    version: "1.2.0",
    kind: "extension",
    azuraCompatibility: ">=0.1.0",
    requiredPackages: ["ecommerce"],
    label: "Ecommerce blocks",
    contributions: { blockTypes: ["productGrid"] },
  });
  assert.equal(extension.ok, true);
  const theme = validatePackageManifest({
    id: "harbor",
    version: "0.1.0",
    kind: "theme",
    azuraCompatibility: "*",
  });
  assert.equal(theme.ok, true);
  const broken = validatePackageManifest({ id: "Bad", version: "1", kind: "plugin" });
  assert.equal(broken.ok, false);
});

test("validation rejects malformed dependency arrays and empty strings", () => {
  const badType = validatePackageManifest({
    id: "x",
    version: "1.0.0",
    kind: "app",
    requiredPackages: [1, "ok"],
  });
  assert.equal(badType.ok, false);
  if (!badType.ok) assert.match(badType.errors.join(" "), /requiredPackages must be a list of strings/);

  const empty = validatePackageManifest({
    id: "x",
    version: "1.0.0",
    kind: "app",
    requiredPresets: ["knowledge", "  "],
  });
  assert.equal(empty.ok, false);
  if (!empty.ok) assert.match(empty.errors.join(" "), /empty strings/);
});

test("validation trims and dedupes dependency ids; rejects non-slugs", () => {
  const ok = validatePackageManifest({
    id: "plugin",
    version: "1.0.0",
    kind: "extension",
    requiredPackages: [" ecommerce ", "ecommerce", "core-app"],
    requiredCapabilities: ["search"],
    requiredPresets: ["knowledge"],
  });
  assert.equal(ok.ok, true);
  if (ok.ok) {
    assert.deepEqual(ok.manifest.requiredPackages, ["ecommerce", "core-app"]);
  }

  const badSlug = validatePackageManifest({
    id: "plugin",
    version: "1.0.0",
    kind: "extension",
    requiredPackages: ["Not A Slug"],
  });
  assert.equal(badSlug.ok, false);
  if (!badSlug.ok) assert.match(badSlug.errors.join(" "), /lowercase slugs/);
});

test("validation rejects requiredPackages that include the package id", () => {
  const self = validatePackageManifest({
    id: "loop",
    version: "1.0.0",
    kind: "app",
    requiredPackages: ["loop"],
  });
  assert.equal(self.ok, false);
  if (!self.ok) assert.match(self.errors.join(" "), /must not include the package id itself/);
});

test("validation requires adminRoutePrefixes to start with /; rejects removed contribution keys", () => {
  const bad = validatePackageManifest({
    id: "x",
    version: "1.0.0",
    kind: "app",
    contributions: {
      adminRoutePrefixes: ["admin/x"],
    },
  });
  assert.equal(bad.ok, false);
  if (!bad.ok) {
    assert.match(bad.errors.join(" "), /adminRoutePrefixes/);
  }

  const removed = validatePackageManifest({
    id: "x",
    version: "1.0.0",
    kind: "app",
    contributions: {
      adminRoutePrefixes: ["/admin/x"],
      publicRoutePrefixes: ["/docs"],
      dashboardSections: ["Docs"],
    },
  });
  assert.equal(removed.ok, false);
  if (!removed.ok) {
    assert.match(removed.errors.join(" "), /publicRoutePrefixes/);
    assert.match(removed.errors.join(" "), /dashboardSections/);
    assert.match(removed.errors.join(" "), /removed in Phase 4/);
  }

  const good = validatePackageManifest({
    id: "x",
    version: "1.0.0",
    kind: "app",
    contributions: {
      adminRoutePrefixes: ["/admin/x"],
    },
  });
  assert.equal(good.ok, true);
});

test("validation rejects unusable azuraCompatibility ranges", () => {
  const bare = validatePackageManifest({
    id: "x",
    version: "1.0.0",
    kind: "app",
    azuraCompatibility: "1.0.0",
  });
  assert.equal(bare.ok, false);
  if (!bare.ok) assert.match(bare.errors.join(" "), /azuraCompatibility/);

  const latest = validatePackageManifest({
    id: "x",
    version: "1.0.0",
    kind: "app",
    azuraCompatibility: "latest",
  });
  assert.equal(latest.ok, false);

  const missing = validatePackageManifest({
    id: "x",
    version: "1.0.0",
    kind: "app",
  });
  assert.equal(missing.ok, true);
  if (missing.ok) assert.equal(missing.manifest.azuraCompatibility, "*");
});

test("compatibility range compares the core version", () => {
  assert.equal(isCompatibleWithCore("*", "0.1.0"), true);
  assert.equal(isCompatibleWithCore(">=0.1.0", "0.1.0"), true);
  assert.equal(isCompatibleWithCore(">=1.0.0", "0.1.0"), false);
  assert.equal(isCompatibleWithCore("1.0.0", "1.0.0"), false);
});

test("requiredPresets align with expandFeatureToggles consumption", () => {
  const validated = validatePackageManifest(
    packageManifestFromModule(documentationModuleManifest),
  );
  assert.equal(validated.ok, true);
  if (!validated.ok) return;
  assert.deepEqual(validated.manifest.requiredPresets, ["knowledge"]);

  const writes = expandFeatureToggles({
    requested: [{ kind: "module", featureId: "documentation", enabled: true }],
    current: new Map([
      ["module:documentation", false],
      ["preset:knowledge", false],
    ]),
    manifests: [
      {
        id: validated.manifest.id,
        requiredPresets: validated.manifest.requiredPresets,
      },
    ],
    includedModules: ["documentation"],
    includedPresets: ["knowledge"],
  });
  assert.ok(writes.some((write) => write.kind === "preset" && write.featureId === "knowledge"));
});

test("zip entries are limited to the manifest and sql migrations", () => {
  assert.equal(validateZipEntryName("azura-package.json"), true);
  assert.equal(validateZipEntryName("theme-tokens.json"), true);
  assert.equal(validateZipEntryName("migrations/001.up.sql"), true);
  assert.equal(validateZipEntryName("migrations/001.down.sql"), true);
  assert.equal(validateZipEntryName("../secret.txt"), false);
  assert.equal(validateZipEntryName("src/app/page.tsx"), false);
  assert.equal(validateZipEntryName("fonts/Inter.woff2"), true);
  assert.equal(validateZipEntryName("assets/logo.png"), true);
  assert.equal(validateZipEntryName("assets/nested/logo.png"), false);
});

test("store zip round-trips the package manifest", () => {
  const source = Buffer.from('{"id":"documentation"}');
  const zip = writeStoreZip([{ name: "azura-package.json", data: source }]);
  const files = readStoreZip(zip);
  assert.equal(files.length, 1);
  assert.equal(files[0].name, "azura-package.json");
  assert.equal(files[0].data.toString("utf8"), source.toString("utf8"));
});

test("enabling an app enables its required preset in the same save", () => {
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
});

test("turning off a required preset also turns off the app", () => {
  const current = new Map<string, boolean>([
    ["module:documentation", true],
    ["preset:knowledge", true],
  ]);
  const writes = expandFeatureToggles({
    requested: [{ kind: "preset", featureId: "knowledge", enabled: false }],
    current,
    manifests: [{ id: "documentation", requiredPresets: ["knowledge"] }],
    includedModules: ["documentation"],
    includedPresets: ["knowledge"],
  });
  const byKey = new Map(writes.map((write) => [`${write.kind}:${write.featureId}`, write.enabled]));
  assert.equal(byKey.get("preset:knowledge"), false);
  assert.equal(byKey.get("module:documentation"), false);
});
