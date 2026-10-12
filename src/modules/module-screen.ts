import "server-only";

import { getDeploymentProfile, isCapabilityEnabled, isModuleEnabled, isPresetEnabled } from "@/config/deployment-profile";
import { isModuleActive, isPresetActive } from "@/config/deployment-profile/site-features";
import { getModuleManifests } from "@/config/deployment-profile/route-registry";
import { listInstalledPackages } from "@/platform/packages/installer";
import { ensureBuiltinPackages } from "@/platform/packages/seed";
import type { ModuleScreenDependency, ModuleScreenModel, ModuleScreenRow } from "@/modules/module-screen-types";

export type { ModuleScreenDependency, ModuleScreenModel, ModuleScreenRow } from "@/modules/module-screen-types";

const MODULE_LABELS: Record<string, string> = {
  documentation: "Documentation",
  "status-page": "Status Page",
  marketing: "Marketing",
};

function labelFor(id: string): string {
  return MODULE_LABELS[id] ?? id;
}

/**
 * One display model for the Modules screen. Module and preset flags reuse the
 * request-scoped SiteFeature load. Capabilities stay profile-only.
 */
export async function listModulesForAdmin(): Promise<ModuleScreenModel> {
  const profile = getDeploymentProfile();
  const profileGenerated = profile.generated;
  try {
    await ensureBuiltinPackages();
  } catch (error) {
    console.error("[modules] package seed skipped", error);
  }
  let installed = new Map<string, { status: string; kind: string }>();
  try {
    const rows = await listInstalledPackages();
    installed = new Map(rows.map((row) => [row.packageId, { status: row.status, kind: row.kind }]));
  } catch (error) {
    console.error("[modules] package list skipped", error);
  }
  const modules: ModuleScreenRow[] = [];

  for (const manifest of getModuleManifests()) {
    const included = isModuleEnabled(manifest.id);
    const enabled = included ? await isModuleActive(manifest.id) : false;
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
    const requiredCapabilities: ModuleScreenDependency[] = manifest.requiredCapabilities.map((capabilityId) => {
      const capabilityIncluded = isCapabilityEnabled(capabilityId);
      return {
        id: capabilityId,
        label: labelFor(capabilityId),
        included: capabilityIncluded,
        enabled: capabilityIncluded,
        writable: false,
      };
    });
    const record = installed.get(manifest.id);
    modules.push({
      id: manifest.id,
      label: labelFor(manifest.id),
      version: manifest.version,
      included,
      enabled,
      writable: profileGenerated && included,
      requiredPresets,
      requiredCapabilities,
      packageKind: record?.kind ?? manifest.packageKind,
      status: record?.status ?? (enabled ? "active" : "inactive"),
    });
  }

  return { profileGenerated, modules };
}
