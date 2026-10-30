/**
 * Pure import classifier for kind=extension contribution overlays (M7.1).
 */
import type { PackageManifest } from "@/platform/packages/manifest";
import {
  buildContributionOwnerMaps,
  type ContributionOwnerMaps,
} from "@/platform/packages/contribution-owner-maps";

export type ExtensionPackageImportDecision =
  | { action: "installed" }
  | { action: "reject"; errors: string[] };

export function decideExtensionPackageImport(input: {
  manifest: PackageManifest;
  entryNames: string[];
  /** Profile-included module ids (isModuleEnabled). */
  enabledModuleIds: ReadonlySet<string> | readonly string[];
  maps?: ContributionOwnerMaps;
}): ExtensionPackageImportDecision {
  if (input.manifest.kind !== "extension") {
    return { action: "reject", errors: ["decideExtensionPackageImport is only for kind extension"] };
  }

  const errors: string[] = [];
  for (const name of input.entryNames) {
    if (name !== "azura-package.json") {
      errors.push(`extension package ZIP entry is not allowed: ${name}`);
    }
  }

  const contrib = input.manifest.contributions;
  if (contrib.adminRoutePrefixes.length > 0) {
    errors.push("extension packages must leave adminRoutePrefixes empty this slice");
  }

  const navIds = contrib.adminNavItemIds;
  const blockTypes = contrib.blockTypes;
  if (navIds.length === 0 && blockTypes.length === 0) {
    errors.push("extension packages must declare at least one adminNavItemIds or blockTypes entry");
  }

  const maps = input.maps ?? buildContributionOwnerMaps();
  const enabled =
    input.enabledModuleIds instanceof Set
      ? input.enabledModuleIds
      : new Set(input.enabledModuleIds);
  const required = new Set(input.manifest.requiredPackages);

  for (const navId of navIds) {
    const owner = maps.navItemIdToModule.get(navId);
    if (!owner) {
      errors.push(`unknown adminNavItemId "${navId}" (not on MODULE_MANIFESTS)`);
      continue;
    }
    if (!required.has(owner)) {
      errors.push(`adminNavItemId "${navId}" owner "${owner}" must be in requiredPackages`);
    }
    if (!enabled.has(owner)) {
      errors.push(`adminNavItemId "${navId}" owner "${owner}" is not included in this deployment profile`);
    }
  }

  for (const blockType of blockTypes) {
    const owner = maps.blockTypeToModule.get(blockType);
    if (!owner) {
      errors.push(`unknown blockType "${blockType}" (not on MODULE_MANIFESTS)`);
      continue;
    }
    if (!required.has(owner)) {
      errors.push(`blockType "${blockType}" owner "${owner}" must be in requiredPackages`);
    }
    if (!enabled.has(owner)) {
      errors.push(`blockType "${blockType}" owner "${owner}" is not included in this deployment profile`);
    }
  }

  if (errors.length > 0) return { action: "reject", errors };
  return { action: "installed" };
}

/** Owners that must be profile-enabled before Open overlay. */
export function extensionOwnerModuleIds(
  manifest: PackageManifest,
  maps: ContributionOwnerMaps = buildContributionOwnerMaps(),
): string[] {
  const owners = new Set<string>();
  for (const navId of manifest.contributions.adminNavItemIds) {
    const owner = maps.navItemIdToModule.get(navId);
    if (owner) owners.add(owner);
  }
  for (const blockType of manifest.contributions.blockTypes) {
    const owner = maps.blockTypeToModule.get(blockType);
    if (owner) owners.add(owner);
  }
  return [...owners];
}
