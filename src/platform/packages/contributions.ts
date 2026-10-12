import "server-only";

import { isModuleEnabled } from "@/config/deployment-profile";
import { isModuleActive } from "@/config/deployment-profile/site-features";
import { getModuleManifests } from "@/config/deployment-profile/route-registry";
import { packageManifestFromModule } from "@/platform/packages/manifest";

/** Nav ids contributed by packages that are not active. Profile-omitted packages are included so their links stay hidden. */
export async function listInactiveContributedNavItemIds(): Promise<string[]> {
  const ids: string[] = [];
  for (const manifest of getModuleManifests()) {
    const active = isModuleEnabled(manifest.id) && (await isModuleActive(manifest.id));
    if (active) continue;
    ids.push(...manifest.navItemIds);
  }
  return ids;
}

export async function listActivePackageSections(): Promise<{ id: string; label: string; href: string }[]> {
  const sections = [];
  for (const manifest of getModuleManifests()) {
    if (!isModuleEnabled(manifest.id) || !(await isModuleActive(manifest.id))) continue;
    const packaged = packageManifestFromModule(manifest);
    const href = packaged.contributions.adminRoutePrefixes[0];
    if (!href) continue;
    sections.push({ id: manifest.id, label: packaged.label, href });
  }
  return sections;
}
