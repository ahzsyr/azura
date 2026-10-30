/**
 * Phase 8 — read-only support diagnostics snapshot (no secrets).
 * Shape helper is pure; live collect uses Prisma when invoked from the export CLI.
 */

import { AZURA_CORE_VERSION, isCompatibleWithCore } from "@/platform/packages/manifest";
import { recoveryHintForPackageError } from "@/platform/packages/package-recovery-hints";

export const SUPPORT_DIAGNOSTICS_SCHEMA_VERSION = 1 as const;

export type SupportDiagnosticsPackage = {
  packageId: string;
  kind: string | null;
  status: string | null;
  version: string | null;
  azuraCompatibility: string | null;
  compatibleWithCore: boolean | null;
  coreVersion: string;
  migrations: {
    appliedUps: number;
    pendingUpCount: number;
  };
  lastLifecycleFailure: {
    action: string;
    reason: string;
    createdAt: string;
  } | null;
  recoveryHint: string | null;
  moduleIncludedInProfile: boolean | null;
};

export type SupportDiagnosticsSnapshot = {
  schemaVersion: typeof SUPPORT_DIAGNOSTICS_SCHEMA_VERSION;
  generatedAt: string;
  profile: {
    profileId: string | null;
    profileSourceHash: string | null;
    generated: boolean;
  };
  packages: SupportDiagnosticsPackage[];
  /** Always empty — reserved so callers never attach ModuleSetting values. */
  secretsExcluded: true;
};

export type SupportDiagnosticsPackageInput = {
  packageId: string;
  kind?: string | null;
  status?: string | null;
  version?: string | null;
  azuraCompatibility?: string | null;
  appliedUps?: number;
  pendingUpCount?: number;
  lastLifecycleFailure?: {
    action: string;
    reason: string;
    createdAt: string;
  } | null;
  moduleIncludedInProfile?: boolean | null;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function redactReason(reason: string): string {
  // Never forward obvious secret-looking payloads; keep short operator text.
  const trimmed = reason.trim().slice(0, 240);
  if (/(password|secret|token|api[_-]?key|authorization)/i.test(trimmed)) {
    return "[redacted]";
  }
  return trimmed;
}

export function buildSupportDiagnosticsPackage(
  input: SupportDiagnosticsPackageInput,
  coreVersion = AZURA_CORE_VERSION,
): SupportDiagnosticsPackage {
  const range = input.azuraCompatibility ?? null;
  const compatibleWithCore =
    range == null ? null : isCompatibleWithCore(range, coreVersion);
  const failure = input.lastLifecycleFailure
    ? {
        action: input.lastLifecycleFailure.action,
        reason: redactReason(input.lastLifecycleFailure.reason),
        createdAt: input.lastLifecycleFailure.createdAt,
      }
    : null;
  const recoveryHint = failure?.reason
    ? recoveryHintForPackageError(failure.reason)
    : null;

  return {
    packageId: input.packageId,
    kind: input.kind ?? null,
    status: input.status ?? null,
    version: input.version ?? null,
    azuraCompatibility: range,
    compatibleWithCore,
    coreVersion,
    migrations: {
      appliedUps: input.appliedUps ?? 0,
      pendingUpCount: input.pendingUpCount ?? 0,
    },
    lastLifecycleFailure: failure,
    recoveryHint,
    moduleIncludedInProfile: input.moduleIncludedInProfile ?? null,
  };
}

export function buildSupportDiagnosticsSnapshot(input: {
  generatedAt?: string;
  profile: {
    profileId: string | null;
    profileSourceHash: string | null;
    generated: boolean;
  };
  packages: SupportDiagnosticsPackageInput[];
  coreVersion?: string;
}): SupportDiagnosticsSnapshot {
  const coreVersion = input.coreVersion ?? AZURA_CORE_VERSION;
  return {
    schemaVersion: SUPPORT_DIAGNOSTICS_SCHEMA_VERSION,
    generatedAt: input.generatedAt ?? new Date().toISOString(),
    profile: {
      profileId: input.profile.profileId,
      profileSourceHash: input.profile.profileSourceHash,
      generated: input.profile.generated,
    },
    packages: input.packages.map((pkg) =>
      buildSupportDiagnosticsPackage(pkg, coreVersion),
    ),
    secretsExcluded: true,
  };
}

/** Pure shape guard for support diagnostics JSON (unit-tested). */
export function assertSupportDiagnosticsShape(
  value: unknown,
): asserts value is SupportDiagnosticsSnapshot {
  if (!isRecord(value)) throw new Error("diagnostics must be an object");
  if (value.schemaVersion !== SUPPORT_DIAGNOSTICS_SCHEMA_VERSION) {
    throw new Error(`schemaVersion must be ${SUPPORT_DIAGNOSTICS_SCHEMA_VERSION}`);
  }
  if (typeof value.generatedAt !== "string" || !value.generatedAt) {
    throw new Error("generatedAt must be a non-empty string");
  }
  if (value.secretsExcluded !== true) {
    throw new Error("secretsExcluded must be true");
  }
  if (!isRecord(value.profile)) throw new Error("profile must be an object");
  if (
    value.profile.profileId !== null &&
    typeof value.profile.profileId !== "string"
  ) {
    throw new Error("profile.profileId must be string|null");
  }
  if (
    value.profile.profileSourceHash !== null &&
    typeof value.profile.profileSourceHash !== "string"
  ) {
    throw new Error("profile.profileSourceHash must be string|null");
  }
  if (typeof value.profile.generated !== "boolean") {
    throw new Error("profile.generated must be boolean");
  }
  if (!Array.isArray(value.packages)) throw new Error("packages must be an array");
  for (const pkg of value.packages) {
    if (!isRecord(pkg)) throw new Error("each package must be an object");
    if (typeof pkg.packageId !== "string" || !pkg.packageId) {
      throw new Error("package.packageId required");
    }
    if ("settings" in pkg || "moduleSettings" in pkg || "secrets" in pkg) {
      throw new Error("diagnostics must not include settings or secrets");
    }
    if (!isRecord(pkg.migrations)) throw new Error("package.migrations required");
    if (typeof pkg.migrations.appliedUps !== "number") {
      throw new Error("migrations.appliedUps must be number");
    }
    if (typeof pkg.migrations.pendingUpCount !== "number") {
      throw new Error("migrations.pendingUpCount must be number");
    }
    if (typeof pkg.coreVersion !== "string") {
      throw new Error("coreVersion must be string");
    }
  }
}

export function isSupportDiagnosticsShape(value: unknown): value is SupportDiagnosticsSnapshot {
  try {
    assertSupportDiagnosticsShape(value);
    return true;
  } catch {
    return false;
  }
}

/** Live DB collect — never reads ModuleSetting values. */
export async function collectSupportDiagnostics(options: {
  packageIds?: string[];
  allBuiltins?: boolean;
}): Promise<SupportDiagnosticsSnapshot> {
  const { prisma } = await import("@/lib/prisma");
  const { getDeploymentProfile, isModuleEnabled } = await import(
    "@/config/deployment-profile"
  );
  const { getModuleManifests } = await import(
    "@/config/deployment-profile/route-registry"
  );
  const { packageManifestFromModule } = await import(
    "@/platform/packages/manifest"
  );
  const { readStoredManifest } = await import("@/platform/packages/seed");
  const { summarizePackageMigrations } = await import(
    "@/platform/packages/package-preflight"
  );

  const profile = getDeploymentProfile();
  const builtins = getModuleManifests().map((m) => m.id);
  const packageIds = options.packageIds?.length
    ? options.packageIds
    : options.allBuiltins
      ? builtins
      : [];

  if (!packageIds.length) {
    throw new Error("Pass --package <id> or --all-builtins");
  }

  const recentFails = await prisma.securityAuditLog.findMany({
    where: { action: { startsWith: "package." } },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  const packages: SupportDiagnosticsPackageInput[] = [];
  for (const packageId of packageIds) {
    const row = await prisma.packageInstallation.findUnique({
      where: { packageId },
    });
    const builtin = getModuleManifests().find((m) => m.id === packageId);
    const stored = row ? readStoredManifest(row.manifest) : null;
    const manifest = builtin ? packageManifestFromModule(builtin) : stored;
    const migrations = await summarizePackageMigrations(packageId);

    let lastLifecycleFailure: SupportDiagnosticsPackageInput["lastLifecycleFailure"] =
      null;
    for (const log of recentFails) {
      if (!log.action.endsWith(".fail")) continue;
      const meta = (log.meta ?? {}) as Record<string, unknown>;
      if (meta.packageId !== packageId) continue;
      const reason =
        typeof meta.reason === "string" ? meta.reason : "unknown failure";
      lastLifecycleFailure = {
        action: log.action,
        reason,
        createdAt: log.createdAt.toISOString(),
      };
      break;
    }

    packages.push({
      packageId,
      kind: manifest?.kind ?? row?.kind ?? null,
      status: row?.status ?? null,
      version: row?.version ?? manifest?.version ?? null,
      azuraCompatibility: manifest?.azuraCompatibility ?? null,
      appliedUps: migrations.appliedUps,
      pendingUpCount: migrations.pendingUpFilenames.length,
      lastLifecycleFailure,
      moduleIncludedInProfile: builtins.includes(packageId)
        ? isModuleEnabled(packageId)
        : null,
    });
  }

  return buildSupportDiagnosticsSnapshot({
    profile: {
      profileId: profile.profileId ?? null,
      profileSourceHash: profile.profileSourceHash ?? null,
      generated: Boolean(profile.generated),
    },
    packages,
  });
}
