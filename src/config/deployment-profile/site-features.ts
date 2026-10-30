import "server-only";

import { cache } from "react";
import type { Prisma, PrismaClient } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { BlockAvailabilityProfile } from "@/features/builder/registry/block-requirement";
import {
  blockingDependents,
  inactiveRequiredPackages,
  planPackageStatusSync,
} from "@/platform/packages/lifecycle";
import { expandFeatureToggles } from "@/platform/packages/site-feature-changes";
import { getDeploymentProfile, isModuleEnabled, isPresetEnabled } from "./load-profile";
import { getModuleManifests } from "./route-registry";

export type SiteFeatureKind = "module" | "preset";

export type SiteFeatureChange = {
  kind: SiteFeatureKind;
  featureId: string;
  enabled: boolean;
};

export class SiteFeatureUpdateError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SiteFeatureUpdateError";
  }
}

type FeatureClient = PrismaClient | Prisma.TransactionClient;

function featureKey(kind: string, featureId: string) {
  return `${kind}:${featureId}`;
}

function includedPairs() {
  const profile = getDeploymentProfile();
  return [
    ...profile.modules.map((featureId) => ({ kind: "module" as const, featureId })),
    ...profile.presets.map((featureId) => ({ kind: "preset" as const, featureId })),
  ];
}

/** Insert enabled rows for profile-included ids that are missing. Ignores omitted ids. */
async function readAndSeed(client: FeatureClient): Promise<Map<string, boolean>> {
  const wanted = includedPairs();
  const existing = await client.siteFeature.findMany();
  const present = new Set(existing.map((row) => featureKey(row.kind, row.featureId)));
  const missing = wanted.filter((item) => !present.has(featureKey(item.kind, item.featureId)));
  if (missing.length > 0) {
    await client.siteFeature.createMany({
      data: missing.map((item) => ({
        kind: item.kind,
        featureId: item.featureId,
        enabled: true,
      })),
      skipDuplicates: true,
    });
  }
  const rows = missing.length > 0 ? await client.siteFeature.findMany() : existing;
  const map = new Map<string, boolean>();
  for (const row of rows) {
    if (row.kind !== "module" && row.kind !== "preset") continue;
    map.set(featureKey(row.kind, row.featureId), row.enabled);
  }
  return map;
}

/**
 * One load per request. A failed read keeps profile-included features active
 * so saved blocks and admin links are not blanked by a ledger outage.
 */
const loadSiteFeatureMap = cache(async (): Promise<Map<string, boolean> | null> => {
  try {
    const { ensureBuiltinPackages } = await import("@/platform/packages/seed");
    await ensureBuiltinPackages();
  } catch (error) {
    console.error("[site-features] package seed skipped", error);
  }
  try {
    return await readAndSeed(prisma);
  } catch (error) {
    console.error("[site-features] failed to load installation flags", error);
    return null;
  }
});

function profileIncludesRuntimeRows(): boolean {
  return getDeploymentProfile().generated;
}

/** True only when the compiled profile includes the module and its row is enabled. */
export async function isModuleActive(moduleId: string): Promise<boolean> {
  if (!isModuleEnabled(moduleId)) return false;
  if (!profileIncludesRuntimeRows()) return true;
  const rows = await loadSiteFeatureMap();
  if (!rows) return true;
  return rows.get(featureKey("module", moduleId)) === true;
}

/**
 * Fail-closed module access for mutation-capable Node ingress.
 * Distinct from `isModuleActive`, which fails open on ledger read errors
 * so admin UI and saved blocks stay visible during an outage.
 */
export type ModuleIngressAccess =
  | "active"
  | "profile_omitted"
  | "runtime_inactive"
  | "ledger_unavailable";

export async function resolveModuleIngressAccess(moduleId: string): Promise<ModuleIngressAccess> {
  if (!isModuleEnabled(moduleId)) return "profile_omitted";
  if (!profileIncludesRuntimeRows()) return "active";
  const rows = await loadSiteFeatureMap();
  if (!rows) return "ledger_unavailable";
  return rows.get(featureKey("module", moduleId)) === true ? "active" : "runtime_inactive";
}

/** True only when the compiled profile includes the preset and its row is enabled. */
export async function isPresetActive(presetId: string): Promise<boolean> {
  if (!isPresetEnabled(presetId)) return false;
  if (!profileIncludesRuntimeRows()) return true;
  const rows = await loadSiteFeatureMap();
  if (!rows) return true;
  return rows.get(featureKey("preset", presetId)) === true;
}

/**
 * Compiled lists with site-disabled modules and presets removed.
 * Capabilities stay on the profile. One object per request.
 */
export async function getEffectiveAvailabilityProfile(): Promise<BlockAvailabilityProfile> {
  const profile = getDeploymentProfile();
  if (!profile.generated) {
    return {
      modules: profile.modules,
      presets: profile.presets,
      capabilities: profile.capabilities,
    };
  }
  const rows = await loadSiteFeatureMap();
  if (!rows) {
    return {
      modules: profile.modules,
      presets: profile.presets,
      capabilities: profile.capabilities,
    };
  }
  return {
    modules: profile.modules.filter((id) => rows.get(featureKey("module", id)) === true),
    presets: profile.presets.filter((id) => rows.get(featureKey("preset", id)) === true),
    capabilities: profile.capabilities,
  };
}

/**
 * Admin builder availability including M7.1 extension overlay locks.
 * Do not use on public render paths — those must call getEffectiveAvailabilityProfile().
 */
export async function getAdminBuilderAvailabilityProfile(): Promise<BlockAvailabilityProfile> {
  const base = await getEffectiveAvailabilityProfile();
  const { listOverlayLockedBlockTypes } = await import("@/platform/packages/contributions");
  const overlayLockedBlockTypes = await listOverlayLockedBlockTypes();
  return {
    ...base,
    overlayLockedBlockTypes,
  };
}

function assertChangeIsIncluded(change: SiteFeatureChange): void {
  const profile = getDeploymentProfile();
  const allowed = change.kind === "module" ? profile.modules : profile.presets;
  if (!profile.generated || !allowed.includes(change.featureId)) {
    throw new SiteFeatureUpdateError(
      `${change.kind} ${change.featureId} is not included in the deployment profile`,
    );
  }
}

function assertEnabledModulesKeepRequiredPresets(state: Map<string, boolean>): void {
  const profile = getDeploymentProfile();
  for (const manifest of getModuleManifests()) {
    if (!profile.modules.includes(manifest.id)) continue;
    if (state.get(featureKey("module", manifest.id)) !== true) continue;
    for (const presetId of manifest.requiredPresets) {
      if (state.get(featureKey("preset", presetId)) !== true) {
        throw new SiteFeatureUpdateError(
          `Module ${manifest.id} requires preset ${presetId} to stay enabled`,
        );
      }
    }
  }
}

function assertModulePackageGraph(state: Map<string, boolean>): void {
  const manifests = getModuleManifests();
  const asDependencyRows = manifests.map((entry) => ({
    packageId: entry.id,
    status: state.get(featureKey("module", entry.id)) === true ? "active" : "inactive",
    requiredPackages: entry.requiredPackages,
  }));

  for (const manifest of manifests) {
    if (state.get(featureKey("module", manifest.id)) !== true) continue;
    const inactive = inactiveRequiredPackages(
      manifest.id,
      manifest.requiredPackages,
      asDependencyRows,
    );
    if (inactive.length > 0) {
      throw new SiteFeatureUpdateError(
        `Module ${manifest.id} requires ${inactive.join(", ")} to be active`,
      );
    }
  }
}

/**
 * Apply enablement changes. Refuses ids the compiled profile omitted.
 * Locks SiteFeature rows, then checks the combined result, including
 * module requiredPresets and requiredPackages. Updates SiteFeature and
 * keeps PackageInstallation.status aligned (active ↔ enabled).
 */
export async function updateSiteFeatures(changes: SiteFeatureChange[]): Promise<void> {
  for (const change of changes) assertChangeIsIncluded(change);
  if (changes.length === 0) return;

  await prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT \`kind\`, \`featureId\` FROM \`SiteFeature\` FOR UPDATE`;
    const state = await readAndSeed(tx);
    const profile = getDeploymentProfile();
    const expanded = expandFeatureToggles({
      requested: changes,
      current: state,
      manifests: getModuleManifests(),
      includedModules: profile.modules,
      includedPresets: profile.presets,
    });
    for (const change of expanded) assertChangeIsIncluded(change);
    for (const change of expanded) {
      state.set(featureKey(change.kind, change.featureId), change.enabled);
    }
    assertEnabledModulesKeepRequiredPresets(state);
    assertModulePackageGraph(state);

    const moduleWrites = expanded.filter((change) => change.kind === "module");
    const installations = await tx.packageInstallation.findMany({
      select: { packageId: true, status: true, manifest: true },
    });
    const dependencyRows = installations.map((row) => {
      const manifest =
        row.manifest && typeof row.manifest === "object" && !Array.isArray(row.manifest)
          ? (row.manifest as { requiredPackages?: unknown })
          : null;
      const requiredPackages = Array.isArray(manifest?.requiredPackages)
        ? manifest.requiredPackages.filter((entry): entry is string => typeof entry === "string")
        : [];
      return {
        packageId: row.packageId,
        status: row.status,
        requiredPackages,
      };
    });

    for (const write of moduleWrites) {
      if (write.enabled) continue;
      const fromRows = blockingDependents(write.featureId, dependencyRows);
      if (fromRows.length > 0) {
        throw new SiteFeatureUpdateError(
          `${write.featureId} is required by ${fromRows.join(", ")}`,
        );
      }
    }

    for (const change of expanded) {
      await tx.siteFeature.update({
        where: {
          kind_featureId: { kind: change.kind, featureId: change.featureId },
        },
        data: { enabled: change.enabled },
      });
    }

    const statusSync = planPackageStatusSync(moduleWrites, installations);
    for (const sync of statusSync) {
      await tx.packageInstallation.update({
        where: { packageId: sync.packageId },
        data: { status: sync.status },
      });
    }
  });
}
