/**
 * Phase 5 — dry-run checks before Modules Manager mutations (no writes).
 */

import { getDeploymentProfile, isModuleEnabled } from "@/config/deployment-profile";
import { getModuleManifests } from "@/config/deployment-profile/route-registry";
import { prisma } from "@/lib/prisma";
import { packageManifestFromModule, type PackageManifest } from "@/platform/packages/manifest";
import type { PackageDependencyRow } from "@/platform/packages/lifecycle";
import { readPackageSqlFiles } from "@/platform/packages/package-migrations";
import {
  evaluatePackagePreflight,
  type PackagePreflightOperation,
  type PackagePreflightResult,
} from "@/platform/packages/package-preflight-core";
import { readStoredManifest } from "@/platform/packages/seed";

export type {
  PackagePreflightIssue,
  PackagePreflightOperation,
  PackagePreflightResult,
  PackagePreflightSnapshot,
} from "@/platform/packages/package-preflight-core";
export { evaluatePackagePreflight } from "@/platform/packages/package-preflight-core";

async function dependencyRows(): Promise<PackageDependencyRow[]> {
  const rows = await prisma.packageInstallation.findMany({
    select: { packageId: true, status: true, manifest: true },
  });
  return rows.map((row) => ({
    packageId: row.packageId,
    status: row.status,
    requiredPackages: readStoredManifest(row.manifest)?.requiredPackages ?? [],
  }));
}

export async function summarizePackageMigrations(packageId: string): Promise<{
  appliedUps: number;
  pendingUpFilenames: string[];
}> {
  const applied = await prisma.packageMigration.findMany({
    where: { packageId, direction: "up" },
    select: { filename: true },
  });
  const appliedNames = new Set(applied.map((row) => row.filename));
  let pendingUpFilenames: string[] = [];
  try {
    const files = await readPackageSqlFiles(packageId);
    pendingUpFilenames = files
      .filter((file) => file.direction === "up" && !appliedNames.has(file.filename))
      .map((file) => file.filename);
  } catch {
    pendingUpFilenames = [];
  }
  return { appliedUps: applied.length, pendingUpFilenames };
}

function resolveManifest(packageId: string, stored: PackageManifest | null): PackageManifest | null {
  const builtin = getModuleManifests().find((m) => m.id === packageId);
  if (builtin) return packageManifestFromModule(builtin);
  return stored;
}

/**
 * Dry-run package operation. Never mutates ledger, SiteFeature, or SQL.
 */
export async function preflightPackageOperation(
  packageId: string,
  operation: PackagePreflightOperation,
): Promise<PackagePreflightResult> {
  const profile = getDeploymentProfile();
  const row = await prisma.packageInstallation.findUnique({ where: { packageId } });
  const stored = row ? readStoredManifest(row.manifest) : null;
  const manifest = resolveManifest(packageId, stored);
  const migrations = await summarizePackageMigrations(packageId);
  const deps = await dependencyRows();
  const builtinIds = new Set(getModuleManifests().map((m) => m.id));

  return evaluatePackagePreflight({
    packageId,
    operation,
    profileGenerated: profile.generated,
    moduleIncluded: isModuleEnabled(packageId),
    isBuiltin: builtinIds.has(packageId),
    status: row?.status ?? "installed",
    manifest,
    deps,
    migrations,
  });
}
