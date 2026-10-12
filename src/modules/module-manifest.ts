import type { BlockType } from "@/types/builder";

/** Installable package role. An app is a Module. An extension contributes to Core or an app. */
export type PackageKind = "app" | "extension" | "theme";

/** Shared metadata contract for profile-gated AZURA Modules and installer packages. */
export type ModuleManifest = {
  id: string;
  version: string;
  packageKind: PackageKind;
  /** Semver range the package accepts, or `*`. */
  azuraCompatibility: string;
  /** Other package ids that must be active before this one can activate. */
  requiredPackages: string[];
  requiredCapabilities: string[];
  requiredPresets: string[];
  adminRoutes: string[];
  publicRoutes: string[];
  navItemIds: string[];
  contributedBlockTypes: BlockType[];
  permissions: string[];
  /** Optional label for the installer and dashboard. Defaults to the id. */
  label?: string;
};
