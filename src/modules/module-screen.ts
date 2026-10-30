import "server-only";

import {
  getDeploymentProfile,
  isCapabilityEnabled,
  isModuleEnabled,
  isPresetEnabled,
} from "@/config/deployment-profile";
import { isModuleActive, isPresetActive } from "@/config/deployment-profile/site-features";
import { getModuleManifests } from "@/config/deployment-profile/route-registry";
import { listInstalledPackages } from "@/platform/packages/installer";
import { ensureBuiltinPackages } from "@/platform/packages/seed";
import { getModuleSettingsDefinition } from "@/platform/packages/module-settings-registry";
import {
  AZURA_CORE_VERSION,
  isCompatibleWithCore,
  packageManifestFromModule,
} from "@/platform/packages/manifest";
import {
  blockingDependents,
  inactiveRequiredPackages,
} from "@/platform/packages/lifecycle";
import { summarizePackageMigrations } from "@/platform/packages/package-preflight";
import { prisma } from "@/lib/prisma";
import type {
  ModuleScreenDependency,
  ModuleScreenModel,
  ModuleScreenPackageDep,
  ModuleScreenRow,
} from "@/modules/module-screen-types";
import "@/modules/documentation/settings";
import "@/modules/status-page/settings";
import "@/modules/marketing/settings";
import "@/modules/advanced-seo/settings";

export type {
  ModuleScreenDependency,
  ModuleScreenModel,
  ModuleScreenRow,
} from "@/modules/module-screen-types";

function settingsHrefFor(packageId: string): string | null {
  return getModuleSettingsDefinition(packageId)?.adminPath ?? null;
}

const MODULE_LABELS: Record<string, string> = {
  documentation: "Documentation",
  "status-page": "Status Page",
  marketing: "Marketing",
  "advanced-seo": "Advanced SEO",
};

function labelFor(id: string): string {
  return MODULE_LABELS[id] ?? id;
}

async function latestFailureHint(packageId: string): Promise<string | null> {
  try {
    const rows = await prisma.securityAuditLog.findMany({
      where: { action: { startsWith: "package." } },
      orderBy: { createdAt: "desc" },
      take: 80,
      select: { action: true, meta: true },
    });
    for (const row of rows) {
      if (!row.action.endsWith(".fail")) continue;
      const meta = row.meta as { packageId?: unknown; reason?: unknown } | null;
      if (meta?.packageId !== packageId) continue;
      return typeof meta.reason === "string" ? meta.reason : null;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * One display model for the Modules screen. Module and preset flags reuse the
 * request-scoped SiteFeature load. Capabilities stay profile-only.
 * Pending (non-builtin) PackageInstallation rows are listed with no enable toggle.
 */
export async function listModulesForAdmin(): Promise<ModuleScreenModel> {
  const profile = getDeploymentProfile();
  const profileGenerated = profile.generated;
  try {
    await ensureBuiltinPackages();
  } catch (error) {
    console.error("[modules] package seed skipped", error);
  }
  let installed = new Map<
    string,
    { status: string; kind: string; version: string; label: string; requiredPackages: string[]; azuraCompatibility: string }
  >();
  try {
    const rows = await listInstalledPackages();
    installed = new Map(
      rows.map((row) => [
        row.packageId,
        {
          status: row.status,
          kind: row.kind,
          version: row.version,
          label: row.label,
          requiredPackages: row.manifest?.requiredPackages ?? [],
          azuraCompatibility: row.manifest?.azuraCompatibility ?? "*",
        },
      ]),
    );
  } catch (error) {
    console.error("[modules] package list skipped", error);
  }

  const depRows = [...installed.entries()].map(([packageId, record]) => ({
    packageId,
    status: record.status,
    requiredPackages: record.requiredPackages,
  }));

  const builtinIds = new Set<string>(getModuleManifests().map((manifest) => manifest.id));
  const modules: ModuleScreenRow[] = [];

  for (const manifest of getModuleManifests()) {
    const included = isModuleEnabled(manifest.id);
    const enabled = included ? await isModuleActive(manifest.id) : false;
    const packaged = packageManifestFromModule(manifest);
    const requiredPresets: ModuleScreenDependency[] = [];
    for (const presetId of manifest.requiredPresets) {
      const presetIncluded = isPresetEnabled(presetId);
      requiredPresets.push({
        id: presetId,
        label: labelFor(presetId),
        included: presetIncluded,
        enabled: presetIncluded ? await isPresetActive(presetId) : false,
        writable: profileGenerated && presetIncluded,
      });
    }
    const requiredCapabilities: ModuleScreenDependency[] = manifest.requiredCapabilities.map(
      (capabilityId) => {
        const capabilityIncluded = isCapabilityEnabled(capabilityId);
        return {
          id: capabilityId,
          label: labelFor(capabilityId),
          included: capabilityIncluded,
          enabled: capabilityIncluded,
          writable: false,
        };
      },
    );
    const requiredPackages: ModuleScreenPackageDep[] = manifest.requiredPackages.map((depId) => {
      const depIncluded = isModuleEnabled(depId);
      const depRow = installed.get(depId);
      return {
        id: depId,
        label: labelFor(depId),
        included: depIncluded,
        active: depRow?.status === "active",
      };
    });
    const record = installed.get(manifest.id);
    const status = record?.status ?? (enabled ? "active" : "inactive");
    const dependencyBlockers = inactiveRequiredPackages(
      manifest.id,
      packaged.requiredPackages,
      depRows,
    );
    const dependentBlockers = blockingDependents(manifest.id, depRows);
    const compatOk = isCompatibleWithCore(packaged.azuraCompatibility);
    const migrationSummary = await summarizePackageMigrations(manifest.id);
    modules.push({
      id: manifest.id,
      label: labelFor(manifest.id),
      version: record?.version ?? manifest.version,
      included,
      enabled,
      writable: profileGenerated && included,
      builtin: true,
      requiredPresets,
      requiredCapabilities,
      requiredPackages,
      dependencyBlockers,
      dependentBlockers,
      compatibility: {
        ok: compatOk,
        range: packaged.azuraCompatibility,
        detail: compatOk
          ? null
          : `Requires ${packaged.azuraCompatibility} (core ${AZURA_CORE_VERSION})`,
      },
      migrationSummary,
      packageKind: record?.kind ?? manifest.packageKind,
      status,
      settingsHref: settingsHrefFor(manifest.id),
      lastFailureHint: await latestFailureHint(manifest.id),
    });
  }

  for (const [packageId, record] of [...installed.entries()].sort(([a], [b]) =>
    a.localeCompare(b),
  )) {
    if (builtinIds.has(packageId)) continue;
    const dependencyBlockers = inactiveRequiredPackages(
      packageId,
      record.requiredPackages,
      depRows,
    );
    const dependentBlockers = blockingDependents(packageId, depRows);
    const compatOk = isCompatibleWithCore(record.azuraCompatibility);
    const migrationSummary = await summarizePackageMigrations(packageId);
    modules.push({
      id: packageId,
      label: record.label || packageId,
      version: record.version,
      included: false,
      enabled: false,
      writable: false,
      builtin: false,
      requiredPresets: [],
      requiredCapabilities: [],
      requiredPackages: record.requiredPackages.map((depId) => ({
        id: depId,
        label: labelFor(depId),
        included: isModuleEnabled(depId),
        active: installed.get(depId)?.status === "active",
      })),
      dependencyBlockers,
      dependentBlockers,
      compatibility: {
        ok: compatOk,
        range: record.azuraCompatibility,
        detail: compatOk
          ? null
          : `Requires ${record.azuraCompatibility} (core ${AZURA_CORE_VERSION})`,
      },
      migrationSummary,
      packageKind: record.kind,
      status: record.status,
      settingsHref: settingsHrefFor(packageId),
      lastFailureHint: await latestFailureHint(packageId),
    });
  }

  return { profileGenerated, modules };
}
