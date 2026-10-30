import assert from "node:assert/strict";
import test from "node:test";
import {
  formatModuleActionError,
  moduleControlsForState,
  moduleLifecycleLabel,
  moduleLockedReason,
  moduleOverlayBadgeLabel,
  moduleOverlayBadges,
  resolveModuleLifecycleState,
  type ModuleLifecycleState,
} from "@/modules/module-screen-ui";

test("resolveModuleLifecycleState maps the five operator states", () => {
  assert.equal(
    resolveModuleLifecycleState({
      builtin: true,
      included: true,
      enabled: true,
      status: "active",
    }),
    "included-and-active",
  );
  assert.equal(
    resolveModuleLifecycleState({
      builtin: true,
      included: true,
      enabled: false,
      status: "inactive",
    }),
    "included-and-inactive",
  );
  assert.equal(
    resolveModuleLifecycleState({
      builtin: true,
      included: false,
      enabled: false,
      status: "active",
    }),
    "profile-omitted",
  );
  assert.equal(
    resolveModuleLifecycleState({
      builtin: false,
      included: false,
      enabled: false,
      status: "pending",
    }),
    "pending",
  );
  assert.equal(
    resolveModuleLifecycleState({
      builtin: false,
      included: false,
      enabled: false,
      status: "installed",
    }),
    "unavailable",
  );
  assert.equal(
    resolveModuleLifecycleState({
      builtin: false,
      included: false,
      enabled: false,
      status: "installed",
      packageKind: "extension",
    }),
    "extension-overlay-ready",
  );
  assert.equal(
    resolveModuleLifecycleState({
      builtin: false,
      included: false,
      enabled: false,
      status: "active",
      packageKind: "extension",
    }),
    "extension-overlay-open",
  );
  assert.equal(
    resolveModuleLifecycleState({
      builtin: false,
      included: false,
      enabled: false,
      status: "inactive",
      packageKind: "extension",
    }),
    "extension-overlay-closed",
  );
});

test("moduleLifecycleLabel is distinct per state", () => {
  const states: ModuleLifecycleState[] = [
    "included-and-active",
    "included-and-inactive",
    "profile-omitted",
    "pending",
    "unavailable",
  ];
  const labels = states.map(moduleLifecycleLabel);
  assert.equal(new Set(labels).size, states.length);
  assert.match(moduleLifecycleLabel("included-and-active"), /Included — active/);
  assert.match(moduleLifecycleLabel("included-and-inactive"), /Included — inactive/);
  assert.match(moduleLifecycleLabel("profile-omitted"), /Not in this deployment profile/);
  assert.match(moduleLifecycleLabel("pending"), /Pending — awaiting deployment/);
  assert.match(moduleLifecycleLabel("unavailable"), /Unavailable in this build/);
});

test("moduleControlsForState: enable only for included + generated profile; never for pending", () => {
  const active = moduleControlsForState("included-and-active", { profileGenerated: true });
  assert.equal(active.enableToggle, true);
  assert.equal(active.requiredPresetToggles, true);
  assert.equal(active.exportZip, true);

  const inactive = moduleControlsForState("included-and-inactive", { profileGenerated: true });
  assert.equal(inactive.enableToggle, true);

  // Deliberate lock: section visible (requiredPresetToggles) with enableToggle off;
  // row writability is separately gated by profileGenerated in module-screen.ts.
  const lockedProfile = moduleControlsForState("included-and-active", { profileGenerated: false });
  assert.equal(lockedProfile.enableToggle, false);
  assert.equal(lockedProfile.requiredPresetToggles, true);
  assert.equal(lockedProfile.exportZip, true);

  for (const state of ["profile-omitted", "pending", "unavailable"] as const) {
    const controls = moduleControlsForState(state, { profileGenerated: true });
    assert.equal(controls.enableToggle, false, state);
    assert.equal(controls.requiredPresetToggles, false, state);
    assert.equal(controls.exportZip, true, state);
  }
});

test("moduleControlsForState M5 matrix: Update / Uninstall / Remove", () => {
  const included = moduleControlsForState("included-and-active", { profileGenerated: true });
  assert.equal(included.update, true);
  assert.equal(included.uninstall, true);
  assert.equal(included.remove, false);

  const locked = moduleControlsForState("included-and-inactive", { profileGenerated: false });
  assert.equal(locked.update, false);
  assert.equal(locked.uninstall, false);
  assert.equal(locked.remove, false);

  const omitted = moduleControlsForState("profile-omitted", { profileGenerated: true });
  assert.equal(omitted.update, false);
  assert.equal(omitted.uninstall, false);
  assert.equal(omitted.remove, false);

  const pending = moduleControlsForState("pending", { profileGenerated: true });
  assert.equal(pending.update, false);
  assert.equal(pending.uninstall, true);
  assert.equal(pending.remove, true);

  const unavailable = moduleControlsForState("unavailable", { profileGenerated: true });
  assert.equal(unavailable.update, false);
  assert.equal(unavailable.uninstall, true);
  assert.equal(unavailable.remove, true);

  const ready = moduleControlsForState("extension-overlay-ready", { profileGenerated: true });
  assert.equal(ready.openOverlay, true);
  assert.equal(ready.closeOverlay, false);
  assert.equal(ready.remove, true);
  assert.equal(ready.enableToggle, false);

  const open = moduleControlsForState("extension-overlay-open", { profileGenerated: true });
  assert.equal(open.openOverlay, false);
  assert.equal(open.closeOverlay, true);
  assert.equal(open.remove, true);

  const closed = moduleControlsForState("extension-overlay-closed", { profileGenerated: true });
  assert.equal(closed.openOverlay, true);
  assert.equal(closed.closeOverlay, false);

  const themeReady = moduleControlsForState("theme-ready", { profileGenerated: true });
  assert.equal(themeReady.applyTheme, true);
  assert.equal(themeReady.deactivateTheme, false);
  assert.equal(themeReady.enableToggle, false);
  assert.equal(themeReady.remove, true);

  const themeApplied = moduleControlsForState("theme-applied", { profileGenerated: true });
  assert.equal(themeApplied.applyTheme, false);
  assert.equal(themeApplied.deactivateTheme, true);

  const themeInactive = moduleControlsForState("theme-inactive", { profileGenerated: true });
  assert.equal(themeInactive.applyTheme, true);
  assert.equal(themeInactive.deactivateTheme, false);
});

test("resolveModuleLifecycleState distinguishes theme packages", () => {
  assert.equal(
    resolveModuleLifecycleState({
      builtin: false,
      included: false,
      enabled: false,
      status: "installed",
      packageKind: "theme",
    }),
    "theme-ready",
  );
  assert.equal(
    resolveModuleLifecycleState({
      builtin: false,
      included: false,
      enabled: false,
      status: "active",
      packageKind: "theme",
    }),
    "theme-applied",
  );
});

test("moduleLockedReason covers omitted, unavailable, and ungenerated profile", () => {
  assert.match(
    moduleLockedReason("profile-omitted", true) ?? "",
    /Not included in the deployment profile/,
  );
  assert.match(
    moduleLockedReason("unavailable", true) ?? "",
    /not registered in this server build/,
  );
  assert.match(
    moduleLockedReason("included-and-active", false) ?? "",
    /profile not generated/,
  );
  assert.equal(moduleLockedReason("pending", true), null);
  assert.equal(moduleLockedReason("included-and-inactive", true), null);
});

test("formatModuleActionError clarifies requiredPackages refusals", () => {
  assert.match(
    formatModuleActionError("Module marketing requires seo-core to be active"),
    /Enable the required packages first/,
  );
  assert.match(
    formatModuleActionError("ecommerce is required by ecommerce-blocks"),
    /Turn those modules off/,
  );
  assert.match(
    formatModuleActionError("custom-ext is pending until its code is deployed"),
    /Deploy a build that includes/,
  );
  assert.match(
    formatModuleActionError("marketing migration 001.up.sql checksum mismatch (refusing)"),
    /Ship a new migration filename/,
  );
});

test("moduleOverlayBadges surfaces Phase 5 overlays without new ledger statuses", () => {
  assert.deepEqual(
    moduleOverlayBadges({
      builtin: true,
      included: false,
      status: "inactive",
      compatibilityOk: false,
      dependencyBlockers: ["docs"],
      pendingMigrationCount: 1,
    }),
    ["profile-omitted", "incompatible", "blocked-by-deps", "migrations-pending"],
  );
  assert.equal(moduleOverlayBadgeLabel("pending"), "Pending");
  assert.equal(moduleOverlayBadgeLabel("blocked-by-deps"), "Blocked by deps");
});
