import assert from "node:assert/strict";
import test from "node:test";
import { documentationModuleManifest } from "@/modules/documentation/manifest";
import {
  isCompatibleWithCore,
  packageManifestFromModule,
  validatePackageManifest,
  validateZipEntryName,
} from "@/platform/packages/manifest";
import { expandFeatureToggles } from "@/platform/packages/site-feature-changes";
import { readStoreZip, writeStoreZip } from "@/platform/packages/zip-store";

test("module manifests become app packages with contributions", () => {
  const manifest = packageManifestFromModule(documentationModuleManifest);
  assert.equal(manifest.kind, "app");
  assert.deepEqual(manifest.contributions.adminNavItemIds, ["documentation"]);
  assert.deepEqual(manifest.contributions.blockTypes, ["documentationNav"]);
  assert.equal(manifest.contributions.publicRoutePrefixes.includes("/api/status-boards"), false);
});

test("package manifest validation accepts apps, extensions, and themes", () => {
  const extension = validatePackageManifest({
    id: "ecommerce-blocks",
    version: "1.2.0",
    kind: "extension",
    azuraCompatibility: ">=0.1.0",
    requiredPackages: ["ecommerce"],
    label: "Ecommerce blocks",
    contributions: { blockTypes: ["productGrid"], dashboardSections: [] },
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

test("compatibility range compares the core version", () => {
  assert.equal(isCompatibleWithCore("*", "0.1.0"), true);
  assert.equal(isCompatibleWithCore(">=0.1.0", "0.1.0"), true);
  assert.equal(isCompatibleWithCore(">=1.0.0", "0.1.0"), false);
  assert.equal(isCompatibleWithCore("1.0.0", "1.0.0"), false);
});

test("zip entries are limited to the manifest and sql migrations", () => {
  assert.equal(validateZipEntryName("azura-package.json"), true);
  assert.equal(validateZipEntryName("migrations/001.up.sql"), true);
  assert.equal(validateZipEntryName("migrations/001.down.sql"), true);
  assert.equal(validateZipEntryName("../secret.txt"), false);
  assert.equal(validateZipEntryName("src/app/page.tsx"), false);
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
