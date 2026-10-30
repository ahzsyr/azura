import type { PackageStatus } from "@/platform/packages/manifest";

export type PackageDependencyRow = {
  packageId: string;
  status: string;
  requiredPackages: readonly string[];
};

export type ModuleFeatureWrite = {
  featureId: string;
  enabled: boolean;
};

/** SiteFeature module enablement maps to PackageInstallation status (never pending). */
export function packageStatusForFeatureEnabled(enabled: boolean): "active" | "inactive" {
  return enabled ? "active" : "inactive";
}

/**
 * Active packages that list `packageId` in requiredPackages.
 * Only `active` status counts — installed/pending/inactive must not block.
 */
export function blockingDependents(
  packageId: string,
  packages: readonly PackageDependencyRow[],
): string[] {
  return packages
    .filter((row) => row.packageId !== packageId)
    .filter((row) => row.status === "active")
    .filter((row) => row.requiredPackages.includes(packageId))
    .map((row) => row.packageId)
    .sort();
}

/** requiredPackages entries that are missing or not active. */
export function inactiveRequiredPackages(
  packageId: string,
  requiredPackages: readonly string[],
  packages: readonly PackageDependencyRow[],
): string[] {
  const byId = new Map(packages.map((row) => [row.packageId, row]));
  return requiredPackages.filter((dependency) => {
    if (dependency === packageId) return false;
    const row = byId.get(dependency);
    return !row || row.status !== "active";
  });
}

/**
 * Module SiteFeature writes that should update PackageInstallation.status.
 * Pending rows are left alone (code not in this build).
 */
export function planPackageStatusSync(
  moduleWrites: readonly ModuleFeatureWrite[],
  packages: readonly { packageId: string; status: string }[],
): Array<{ packageId: string; status: "active" | "inactive" }> {
  const byId = new Map(packages.map((row) => [row.packageId, row]));
  const planned: Array<{ packageId: string; status: "active" | "inactive" }> = [];
  for (const write of moduleWrites) {
    const row = byId.get(write.featureId);
    if (!row) continue;
    if (row.status === "pending") continue;
    const next = packageStatusForFeatureEnabled(write.enabled);
    if (row.status === next) continue;
    planned.push({ packageId: write.featureId, status: next });
  }
  return planned;
}

/**
 * Modules that remain enabled in a SiteFeature state map and declare a
 * requiredPackages dependency on `packageId` (manifest graph, not only DB rows).
 */
export function blockingEnabledModuleDependents(
  packageId: string,
  enabledModuleIds: readonly string[],
  manifests: readonly { id: string; requiredPackages: readonly string[] }[],
): string[] {
  const enabled = new Set(enabledModuleIds);
  return manifests
    .filter((manifest) => manifest.id !== packageId)
    .filter((manifest) => enabled.has(manifest.id))
    .filter((manifest) => manifest.requiredPackages.includes(packageId))
    .map((manifest) => manifest.id)
    .sort();
}

export function isLifecycleActiveStatus(status: string): status is Extract<PackageStatus, "active"> {
  return status === "active";
}
