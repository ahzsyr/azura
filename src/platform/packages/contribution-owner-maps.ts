/**
 * Map shipped contribution ids → owning module from MODULE_MANIFESTS (M7.1).
 */
import { getModuleManifests } from "@/config/deployment-profile/route-registry";

export type ContributionOwnerMaps = {
  navItemIdToModule: Map<string, string>;
  blockTypeToModule: Map<string, string>;
};

export function buildContributionOwnerMaps(
  manifests: ReadonlyArray<{
    id: string;
    navItemIds: readonly string[];
    contributedBlockTypes: readonly string[];
  }> = getModuleManifests(),
): ContributionOwnerMaps {
  const navItemIdToModule = new Map<string, string>();
  const blockTypeToModule = new Map<string, string>();
  for (const manifest of manifests) {
    for (const navId of manifest.navItemIds) {
      if (!navItemIdToModule.has(navId)) navItemIdToModule.set(navId, manifest.id);
    }
    for (const blockType of manifest.contributedBlockTypes) {
      if (!blockTypeToModule.has(blockType)) blockTypeToModule.set(blockType, manifest.id);
    }
  }
  return { navItemIdToModule, blockTypeToModule };
}
