import "server-only";

import { isModuleEnabled } from "@/config/deployment-profile";
import { isModuleActive } from "@/config/deployment-profile/site-features";
import { getModuleManifests } from "@/config/deployment-profile/route-registry";
import { packageManifestFromModule } from "@/platform/packages/manifest";
import {
  resolveActivePackageSections,
  resolveInactiveContributedNavItemIds,
} from "@/platform/packages/contribution-inventory";
import {
  resolveOverlayLockedBlockTypes,
  resolveOverlayNavInactiveIds,
  type OverlayExtensionRow,
} from "@/platform/packages/overlay-resolve";
import { prisma } from "@/lib/prisma";
import { readInstallationEnvelope } from "@/platform/packages/installation-envelope";

async function loadOverlayExtensionRows(): Promise<OverlayExtensionRow[]> {
  try {
    const rows = await prisma.packageInstallation.findMany({
      where: { kind: "extension" },
    });
    const out: OverlayExtensionRow[] = [];
    for (const row of rows) {
      const envelope = readInstallationEnvelope(row.manifest);
      const contrib = envelope?.package.contributions;
      if (!contrib) continue;
      out.push({
        status: row.status,
        navItemIds: contrib.adminNavItemIds,
        blockTypes: contrib.blockTypes,
      });
    }
    return out;
  } catch {
    return [];
  }
}

/** Nav ids contributed by packages that are not active. Profile-omitted packages are included so their links stay hidden. */
export async function listInactiveContributedNavItemIds(): Promise<string[]> {
  const modules = [];
  for (const manifest of getModuleManifests()) {
    const active = isModuleEnabled(manifest.id) && (await isModuleActive(manifest.id));
    modules.push({ active, navItemIds: manifest.navItemIds });
  }
  const moduleInactiveNavIds = resolveInactiveContributedNavItemIds(modules);
  const extensionRows = await loadOverlayExtensionRows();
  return resolveOverlayNavInactiveIds({ extensionRows, moduleInactiveNavIds });
}

/** Admin builder only — block types locked by armed-closed extension overlays. */
export async function listOverlayLockedBlockTypes(): Promise<string[]> {
  const extensionRows = await loadOverlayExtensionRows();
  return resolveOverlayLockedBlockTypes(extensionRows);
}

/**
 * Dashboard links for active built-in Modules only (getModuleManifests — no ledger read).
 * One link per package: label + adminRoutePrefixes[0]. Imported/pending packages never appear.
 * Dashboard uses package label + adminRoutePrefixes[0] (Phase 4: no dashboardSections key).
 */
export async function listActivePackageSections(): Promise<{ id: string; label: string; href: string }[]> {
  const packages = [];
  for (const manifest of getModuleManifests()) {
    const active = isModuleEnabled(manifest.id) && (await isModuleActive(manifest.id));
    const packaged = packageManifestFromModule(manifest);
    packages.push({
      id: manifest.id,
      active,
      label: packaged.label,
      adminRoutePrefixes: packaged.contributions.adminRoutePrefixes,
    });
  }
  return resolveActivePackageSections(packages);
}
