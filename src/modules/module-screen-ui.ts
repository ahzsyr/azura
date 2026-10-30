/**
 * Operator-facing lifecycle mapping for the Modules Manager (Option A + C).
 * Pure helpers: status → label and which controls the backend can honor.
 */

import { recoveryHintForPackageError } from "@/platform/packages/package-recovery-hints";

export type ModuleOverlayBadge =
  | "pending"
  | "incompatible"
  | "blocked-by-deps"
  | "migrations-pending"
  | "profile-omitted";

export type ModuleOverlayInput = {
  builtin: boolean;
  included: boolean;
  status: string;
  compatibilityOk: boolean;
  dependencyBlockers: readonly string[];
  pendingMigrationCount: number;
};

/** Computed card overlays — not new ledger statuses. */
export function moduleOverlayBadges(input: ModuleOverlayInput): ModuleOverlayBadge[] {
  const badges: ModuleOverlayBadge[] = [];
  if (input.status === "pending") badges.push("pending");
  if (input.builtin && !input.included) badges.push("profile-omitted");
  if (!input.compatibilityOk) badges.push("incompatible");
  if (input.dependencyBlockers.length > 0) badges.push("blocked-by-deps");
  if (input.pendingMigrationCount > 0) badges.push("migrations-pending");
  return badges;
}

export function moduleOverlayBadgeLabel(badge: ModuleOverlayBadge): string {
  switch (badge) {
    case "pending":
      return "Pending";
    case "incompatible":
      return "Incompatible";
    case "blocked-by-deps":
      return "Blocked by deps";
    case "migrations-pending":
      return "Migrations pending";
    case "profile-omitted":
      return "Profile omitted";
  }
}

export type ModuleLifecycleState =
  | "included-and-active"
  | "included-and-inactive"
  | "profile-omitted"
  | "pending"
  | "unavailable"
  | "extension-overlay-ready"
  | "extension-overlay-open"
  | "extension-overlay-closed"
  | "theme-ready"
  | "theme-applied"
  | "theme-inactive";

export type ModuleLifecycleInput = {
  builtin: boolean;
  included: boolean;
  enabled: boolean;
  status: string;
  packageKind?: string;
};

export type ModuleControlAvailability = {
  /** SiteFeature / activatePackage enablement toggle */
  enableToggle: boolean;
  /** Required-preset toggles under this module card */
  requiredPresetToggles: boolean;
  /** Metadata + SQL ZIP export */
  exportZip: boolean;
  /** Re-apply ship-time up SQL / version bump (builtin + generated + included) */
  update: boolean;
  /** Soft uninstall — deactivate for included builtins; ledger clear for pending/non-builtin */
  uninstall: boolean;
  /** Typed Remove — pending / non-builtin ledger rows only (never builtins) */
  remove: boolean;
  /** M7.1 extension: Open overlay (activatePackage) */
  openOverlay: boolean;
  /** M7.1 extension: Close overlay (deactivatePackage) — hides gated admin features */
  closeOverlay: boolean;
  /** Theme token package: Apply (activatePackage) */
  applyTheme: boolean;
  /** Theme token package: soft Deactivate (clears provenance; look stays) */
  deactivateTheme: boolean;
};

export function resolveModuleLifecycleState(input: ModuleLifecycleInput): ModuleLifecycleState {
  if (!input.builtin && input.packageKind === "extension") {
    if (input.status === "active") return "extension-overlay-open";
    if (input.status === "inactive") return "extension-overlay-closed";
    if (input.status === "installed") return "extension-overlay-ready";
  }
  if (!input.builtin && input.packageKind === "theme") {
    if (input.status === "active") return "theme-applied";
    if (input.status === "inactive") return "theme-inactive";
    if (input.status === "installed") return "theme-ready";
    if (input.status === "pending") return "pending";
  }
  if (!input.builtin) {
    if (input.status === "pending") return "pending";
    return "unavailable";
  }
  if (!input.included) return "profile-omitted";
  if (input.enabled) return "included-and-active";
  return "included-and-inactive";
}

export function moduleLifecycleLabel(state: ModuleLifecycleState): string {
  switch (state) {
    case "included-and-active":
      return "Included — active";
    case "included-and-inactive":
      return "Included — inactive";
    case "profile-omitted":
      return "Not in this deployment profile";
    case "pending":
      return "Pending — awaiting deployment";
    case "unavailable":
      return "Unavailable in this build";
    case "extension-overlay-ready":
      return "Extension overlay — ready to open";
    case "extension-overlay-open":
      return "Extension overlay — open";
    case "extension-overlay-closed":
      return "Extension overlay — closed (admin features gated)";
    case "theme-ready":
      return "Theme package — ready to apply";
    case "theme-applied":
      return "Theme package — applied";
    case "theme-inactive":
      return "Theme package — not applied";
  }
}

/**
 * Controls the Modules card may offer. Mirrors server eligibility — not a substitute for installer guards.
 */
export function moduleControlsForState(
  state: ModuleLifecycleState,
  options: { profileGenerated: boolean },
): ModuleControlAvailability {
  const includedInProfile =
    state === "included-and-active" || state === "included-and-inactive";
  const generatedIncluded = options.profileGenerated && includedInProfile;
  const pendingOrUnavailable = state === "pending" || state === "unavailable";
  const isExtension =
    state === "extension-overlay-ready" ||
    state === "extension-overlay-open" ||
    state === "extension-overlay-closed";
  const isTheme =
    state === "theme-ready" || state === "theme-applied" || state === "theme-inactive";
  return {
    enableToggle: generatedIncluded,
    requiredPresetToggles: includedInProfile,
    exportZip: true,
    update: generatedIncluded,
    // Soft uninstall for themes: ledger clear (non-builtin). Distinct from Deactivate.
    uninstall: generatedIncluded || pendingOrUnavailable || isTheme,
    // Remove is typed destructive for pending/unavailable/extensions/themes — not soft uninstall twin for builtins.
    remove: pendingOrUnavailable || isExtension || isTheme,
    openOverlay:
      options.profileGenerated &&
      (state === "extension-overlay-ready" || state === "extension-overlay-closed"),
    closeOverlay: options.profileGenerated && state === "extension-overlay-open",
    applyTheme:
      options.profileGenerated && (state === "theme-ready" || state === "theme-inactive"),
    deactivateTheme: options.profileGenerated && state === "theme-applied",
  };
}

/** Map backend refusal strings into operator-facing copy without inventing new operations. */
export function formatModuleActionError(raw: string): string {
  const message = raw.trim() || "Could not save this package";
  const hint = recoveryHintForPackageError(message);
  if (hint && !message.includes(hint)) {
    return `${message}. ${hint}`;
  }
  return message;
}

export function moduleLockedReason(
  state: ModuleLifecycleState,
  profileGenerated: boolean,
): string | null {
  if (state === "pending") return null;
  if (state === "extension-overlay-ready") {
    return "Imported overlay is inert until you Open it. Listed admin features stay available until then.";
  }
  if (state === "extension-overlay-open") {
    return "Overlay is open. Close overlay to hide its listed admin nav/blocks; Remove to unarm.";
  }
  if (state === "extension-overlay-closed") {
    return "Overlay is closed — listed admin nav/blocks are hidden. Open again or Remove to restore module-only visibility.";
  }
  if (state === "theme-ready") {
    return "Token theme is imported. Apply to merge tokens onto the published site theme (draft must be clean).";
  }
  if (state === "theme-applied") {
    return "This theme is the applied source. Deactivate clears that bookkeeping; the live look stays until another apply or Theme Studio change.";
  }
  if (state === "theme-inactive") {
    return "Theme package is not the applied source. Apply again to re-stamp provenance, or Remove to clear the ledger.";
  }
  if (state === "unavailable") {
    return "This package id is not registered in this server build, so it cannot be enabled here.";
  }
  if (state === "profile-omitted") {
    return "Not included in the deployment profile — no enable toggle. Edit profile YAML → profile:generate → redeploy.";
  }
  if (!profileGenerated && (state === "included-and-active" || state === "included-and-inactive")) {
    return state === "included-and-active"
      ? "Enabled for this installation (profile not generated — toggles locked). Edit profile YAML → profile:generate → redeploy."
      : "Not enabled for this installation (profile not generated — toggles locked). Edit profile YAML → profile:generate → redeploy.";
  }
  return null;
}

export function openOverlayButtonLabel(): string {
  return "Open overlay";
}

export function closeOverlayButtonLabel(): string {
  return "Close overlay";
}

export function openOverlayDescription(): string {
  return "Apply this extension overlay. Required owner modules must be included and active. After the first open, closing the overlay hides its listed admin features until you open again or remove the package.";
}

export function closeOverlayDescription(): string {
  return "Close this overlay. Unlike theme Deactivate (live look unchanged), closing an extension overlay hides its listed admin nav items and block picker entries until Open or Remove.";
}

export function applyThemeButtonLabel(): string {
  return "Apply theme";
}

export function deactivateThemeButtonLabel(): string {
  return "Deactivate theme";
}

export function applyThemeDescription(): string {
  return "Merge this package’s tokens onto the published SiteTheme. Theme Studio draft must be clean. Does not load executable code.";
}

export function deactivateThemeDescription(): string {
  return "Stop marking this package as the applied source. The live look stays until another Apply or a Theme Studio change.";
}
