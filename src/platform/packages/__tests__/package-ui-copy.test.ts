import assert from "node:assert/strict";
import test from "node:test";
import {
  exportZipButtonLabel,
  exportZipDescription,
  importResultMessage,
  importZipDescription,
  modulesPageDescription,
  packageOriginBadge,
  packageStatusLabel,
  packageUiOrigin,
  pendingPackageExplanation,
  profileRebuildGuidance,
  purgeUnavailableNote,
  removePackageConfirmBody,
  uninstallBuiltinConfirmBody,
  uninstallBuiltinConfirmTitle,
} from "@/platform/packages/package-ui-copy";

test("packageUiOrigin distinguishes builtin, pending, and unknown", () => {
  assert.equal(packageUiOrigin({ status: "active", builtin: true }), "builtin");
  assert.equal(packageUiOrigin({ status: "pending", builtin: false }), "pending");
  assert.equal(packageUiOrigin({ status: "inactive", builtin: false }), "unknown");
  assert.equal(packageUiOrigin({ status: "pending", builtin: true }), "builtin");
});

test("pending status label and explanation are deployment-honest", () => {
  assert.match(packageStatusLabel("pending", false), /Pending — awaiting deployment/);
  assert.match(pendingPackageExplanation(), /Awaiting a deployment that includes this package's code and registry entry/);
  assert.match(pendingPackageExplanation(), /cannot be installed or activated/);
  assert.equal(packageOriginBadge("pending"), "Pending");
});

test("builtin status labels stay simple and origin badge says in this build", () => {
  assert.equal(packageStatusLabel("active", true), "Active");
  assert.equal(packageStatusLabel("inactive", true), "Inactive");
  assert.equal(packageStatusLabel("installed", true), "Installed");
  assert.equal(packageOriginBadge("builtin"), "In this build");
});

test("unknown non-builtin theme package labels describe apply state", () => {
  assert.match(packageStatusLabel("active", false), /Applied theme/i);
  assert.match(packageStatusLabel("installed", false), /ready to apply/i);
  assert.equal(packageOriginBadge("unknown"), "Not in this build");
});

test("import result messages: pending vs installed theme-ready", () => {
  const pending = importResultMessage("custom-ext", "pending");
  assert.match(pending, /stored as pending/i);
  assert.match(pending, /awaits a deployment/i);
  assert.match(pending, /cannot be activated from this ZIP alone/i);

  const installed = importResultMessage("demo-theme-tokens", "installed");
  assert.match(installed, /ready/i);
  assert.match(installed, /activate to apply tokens/i);
  assert.match(installed, /Open overlay/i);

  const active = importResultMessage("marketing", "active");
  assert.match(active, /already in this build/i);
  assert.match(active, /active/i);
});

test("import ZIP description covers themes, extensions, and never claims executable loading", () => {
  const copy = importZipDescription();
  assert.match(copy, /theme-tokens\.json/);
  assert.match(copy, /Extension overlays/i);
  assert.match(copy, /migrations/i);
  assert.match(copy, /never executable code/i);
  assert.match(copy, /SQL in the ZIP is not applied/i);
  assert.doesNotMatch(copy, /full app backup/i);
});

test("Remove confirm warns down SQL; soft uninstall does not", () => {
  const remove = removePackageConfirmBody("demo-theme");
  assert.match(remove, /allowlisted down SQL/i);
  assert.match(remove, /not Soft Uninstall/i);
  assert.match(remove, /does not purge CMS/i);
  const soft = uninstallBuiltinConfirmBody("Marketing");
  assert.doesNotMatch(soft, /down SQL/i);
  assert.match(soft, /Same effect as turning Enabled off/i);
  assert.match(uninstallBuiltinConfirmTitle(), /same as turning Enabled off/i);
  assert.match(purgeUnavailableNote(), /Purge \(content wipe\) is not available/i);
  assert.match(profileRebuildGuidance(), /profile:generate/i);
});

test("export ZIP wording includes theme tokens when present", () => {
  const copy = exportZipDescription();
  assert.match(copy, /azura-package\.json/i);
  assert.match(copy, /theme-tokens\.json/i);
  assert.match(copy, /not runnable app code/i);
  assert.equal(exportZipButtonLabel(), "Export metadata ZIP");
});

test("modules page description mentions theme packages and Open/Close overlays", () => {
  const copy = modulesPageDescription();
  assert.match(copy, /Theme packages/i);
  assert.match(copy, /Soft-deactivating a theme/i);
  assert.match(copy, /Open\/Close/i);
});

test("export ZIP notes theme binaries are not re-emitted", () => {
  const copy = exportZipDescription();
  assert.match(copy, /does not re-emit/i);
});
