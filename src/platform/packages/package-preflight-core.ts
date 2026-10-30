/**
 * Pure Phase 5 preflight evaluation (no Prisma / server-only).
 */

import {
  AZURA_CORE_VERSION,
  isCompatibleWithCore,
  type PackageManifest,
} from "@/platform/packages/manifest";
import {
  blockingDependents,
  inactiveRequiredPackages,
  type PackageDependencyRow,
} from "@/platform/packages/lifecycle";

export type PackagePreflightOperation =
  | "activate"
  | "deactivate"
  | "update"
  | "applyTheme"
  | "openExtension";

export type PackagePreflightIssue = {
  code: string;
  message: string;
  recoveryHint?: string;
};

export type PackagePreflightResult = {
  ok: boolean;
  operation: PackagePreflightOperation;
  packageId: string;
  blockers: PackagePreflightIssue[];
  warnings: PackagePreflightIssue[];
  migrations: { appliedUps: number; pendingUpFilenames: string[] };
  profileNotes: string[];
  recoveryHints: string[];
};

export type PackagePreflightSnapshot = {
  packageId: string;
  operation: PackagePreflightOperation;
  profileGenerated: boolean;
  moduleIncluded: boolean;
  isBuiltin: boolean;
  status: string;
  manifest: PackageManifest | null;
  deps: PackageDependencyRow[];
  migrations: { appliedUps: number; pendingUpFilenames: string[] };
};

/** Pure dry-run evaluation — used by API and unit tests. */
export function evaluatePackagePreflight(snapshot: PackagePreflightSnapshot): PackagePreflightResult {
  const blockers: PackagePreflightIssue[] = [];
  const warnings: PackagePreflightIssue[] = [];
  const profileNotes: string[] = [];
  const recoveryHints: string[] = [];
  const { packageId, operation, manifest, migrations } = snapshot;

  if (!snapshot.profileGenerated) {
    blockers.push({
      code: "profile_ungenerated",
      message: "A deployment profile has not been generated.",
      recoveryHint:
        "Edit docs/profiles YAML, run npm run profile:generate (or prebuild), then redeploy.",
    });
    profileNotes.push(
      "Edit profile YAML → profile:generate → redeploy. Modules Manager cannot generate profiles.",
    );
  }

  if (
    snapshot.status === "pending" &&
    (operation === "activate" || operation === "update" || operation === "openExtension")
  ) {
    blockers.push({
      code: "pending",
      message: `${packageId} is pending until its code is deployed.`,
      recoveryHint:
        "Ship the package in a build that includes its Module registry entry, then re-import or activate.",
    });
  }

  if (manifest && !isCompatibleWithCore(manifest.azuraCompatibility)) {
    blockers.push({
      code: "incompatible",
      message: `${packageId} requires AZURA ${manifest.azuraCompatibility} (core ${AZURA_CORE_VERSION}).`,
      recoveryHint: "Upgrade AZURA core or install a compatible package version.",
    });
  }

  if (
    (operation === "activate" || operation === "update") &&
    snapshot.isBuiltin &&
    snapshot.profileGenerated &&
    !snapshot.moduleIncluded
  ) {
    blockers.push({
      code: "profile_omitted",
      message: `${packageId} is not included in the deployment profile.`,
      recoveryHint: "Add the Module to the selected profile YAML, run profile:generate, and redeploy.",
    });
    profileNotes.push(`Add “${packageId}” to the profile modules list, generate, redeploy.`);
  }

  if (operation === "activate" || operation === "openExtension" || operation === "applyTheme") {
    if (manifest) {
      const inactive = inactiveRequiredPackages(packageId, manifest.requiredPackages, snapshot.deps);
      if (inactive.length > 0) {
        blockers.push({
          code: "deps_inactive",
          message: `${packageId} requires ${inactive.join(", ")} to be active.`,
          recoveryHint: "Enable the required packages first, then try again.",
        });
      }
    }
  }

  if (operation === "deactivate") {
    const blocking = blockingDependents(packageId, snapshot.deps);
    if (blocking.length > 0) {
      blockers.push({
        code: "dependents_active",
        message: `${packageId} is required by ${blocking.join(", ")}.`,
        recoveryHint: "Turn those modules off before disabling this one.",
      });
    }
  }

  if (
    migrations.pendingUpFilenames.length > 0 &&
    (operation === "activate" || operation === "update")
  ) {
    warnings.push({
      code: "migrations_pending",
      message: `Pending up migrations: ${migrations.pendingUpFilenames.join(", ")}.`,
      recoveryHint: "Confirm will apply allowlisted ship-time up SQL (checksum-idempotent).",
    });
  }

  for (const issue of [...blockers, ...warnings]) {
    if (issue.recoveryHint) recoveryHints.push(issue.recoveryHint);
  }

  return {
    ok: blockers.length === 0,
    operation,
    packageId,
    blockers,
    warnings,
    migrations,
    profileNotes: [...new Set(profileNotes)],
    recoveryHints: [...new Set(recoveryHints)],
  };
}
