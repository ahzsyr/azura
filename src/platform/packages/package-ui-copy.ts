/**
 * Honest Modules Manager copy for build-time-distributed packages (Option A + C).
 * App/extension ZIP: metadata + optional SQL only — never executable app code.
 * Theme ZIP (M7): metadata + theme-tokens.json may activate without a rebuild.
 */

export type PackageUiOrigin = "builtin" | "pending" | "unknown";

export function packageUiOrigin(input: {
  status: string;
  builtin: boolean;
}): PackageUiOrigin {
  if (input.builtin) return "builtin";
  if (input.status === "pending") return "pending";
  return "unknown";
}

/** Short status chip for the Modules list. */
export function packageStatusLabel(status: string, builtin: boolean): string {
  const origin = packageUiOrigin({ status, builtin });
  if (origin === "pending") return "Pending — awaiting deployment";
  if (origin === "unknown") {
    if (status === "active") return "Applied theme (token package)";
    if (status === "inactive") return "Theme package (not applied)";
    if (status === "installed") return "Theme package (ready to apply)";
    return `${status} (not in this build)`;
  }
  if (status === "active") return "Active";
  if (status === "inactive") return "Inactive";
  if (status === "installed") return "Installed";
  if (status === "pending") return "Pending — awaiting deployment";
  return status;
}

export function pendingPackageExplanation(): string {
  return "Awaiting a deployment that includes this package's code and registry entry. This ZIP only stored metadata (and optional SQL files that are not applied from the ZIP). It cannot be installed or activated until that deploy ships.";
}

export function builtinPackageHint(): string {
  return "Shipped in this server build. Enablement toggles SiteFeature for this installation; it does not load new code from a ZIP.";
}

export function importZipDescription(): string {
  return "Upload an azura-package.zip. Apps: manifest + optional migrations/*.sql (never executable code; SQL in the ZIP is not applied for unknown/pending apps — only ship-time filesystem migrations run for builtins). Theme packages: manifest + theme-tokens.json plus optional assets/logo.*, assets/favicon.*, fonts/* (stored as CMS media; fonts appear under Documents). SVG logos must not reference external resources — embed or remove them. Extension overlays: manifest only. Theme ZIPs must not include SQL. Unknown app ids stay pending until a deploy ships their code.";
}

export function importResultMessage(packageId: string, status: string): string {
  if (status === "pending") {
    return `${packageId} was stored as pending. It awaits a deployment that includes this package's code and registry entry — it cannot be activated from this ZIP alone.`;
  }
  if (status === "active") {
    return `${packageId} is already in this build and is active for this installation.`;
  }
  if (status === "inactive") {
    return `${packageId} is recorded inactive. For theme packages, activate to apply tokens to the live site theme (look stays until another apply).`;
  }
  if (status === "installed") {
    return `${packageId} was imported and is ready. Token themes: activate to apply tokens. Extension overlays: Open overlay when ready (import alone does not hide features).`;
  }
  return `${packageId} was imported with status “${status}”.`;
}

export function exportZipDescription(): string {
  return "Downloads azura-package.json, theme-tokens.json when present (with package: asset refs), and SQL migrations for builtins. Theme export does not re-emit logo/font binaries — re-attach them on re-import. Metadata/token bundle — not runnable app code.";
}

export function exportZipButtonLabel(): string {
  return "Export metadata ZIP";
}

export function modulesPageDescription(): string {
  return "Enable apps included in this deployment profile. ZIP import stores a manifest (and optional SQL for apps). Theme packages can apply tokens plus approved logo/favicon/fonts without a rebuild. Soft-deactivating a theme stops marking it as the applied source; the live look stays. Extension overlays use Open/Close (Close hides listed admin nav/blocks until Open or Remove).";
}

export function importZipHeading(): string {
  return "Import package ZIP";
}

export function updatePackageButtonLabel(): string {
  return "Update";
}

export function updatePackageDescription(): string {
  return "Re-applies this build’s package SQL and refreshes the recorded version. Does not load code from a ZIP.";
}

export function uninstallBuiltinConfirmTitle(): string {
  return "Uninstall (same as turning Enabled off)";
}

export function uninstallBuiltinConfirmBody(label: string): string {
  return `Same effect as turning Enabled off for ${label}: deactivate and keep the ledger row. Package code stays in this server build, stored content is retained, and you can enable it again later. This does not remove the app from the deployment profile, and it is not a content purge.`;
}

/** Static note near Remove — purge product is deferred. */
export function purgeUnavailableNote(): string {
  return "Purge (content wipe) is not available in Modules Manager.";
}

export function profileRebuildGuidance(): string {
  return "To change which Modules a build includes: edit the profile YAML, run npm run profile:generate (or prebuild), then redeploy. Modules Manager cannot generate profiles.";
}

export function profileUngeneratedBanner(): string {
  return `A deployment profile has not been generated. Modules are shown as enabled and cannot be changed. ${profileRebuildGuidance()}`;
}

export function profileOmittedGuidance(label: string): string {
  return `${label} is not in this deployment profile. ${profileRebuildGuidance()}`;
}

export function uninstallPendingConfirmTitle(): string {
  return "Remove from queue";
}

export function uninstallPendingConfirmBody(label: string): string {
  return `Soft-clear the ledger row for ${label} without running down SQL. This does not drop database schema or purge CMS content. Use typed Remove only when you intend a destructive ledger wipe (and possible down SQL).`;
}

export function removePackageButtonLabel(): string {
  return "Remove";
}

export function removePackageConfirmTitle(): string {
  return "Remove package ledger row";
}

export function removePackageConfirmBody(packageId: string): string {
  return `Destructive Remove for “${packageId}”: may run allowlisted down SQL for this package (if any ship-time downs exist), then deletes the Modules ledger row. This is not Soft Uninstall, and it does not purge CMS/content rows by itself. Built-in apps cannot be Removed here. Type the package id to confirm.`;
}

export function uninstallButtonLabel(state: "pending" | "builtin" | "other"): string {
  if (state === "pending") return "Remove from queue";
  if (state === "builtin") return "Uninstall";
  return "Uninstall";
}

export function packageOriginBadge(origin: PackageUiOrigin): string {
  if (origin === "builtin") return "In this build";
  if (origin === "pending") return "Pending";
  return "Not in this build";
}
