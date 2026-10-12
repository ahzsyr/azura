import type { BlockType } from "@/types/builder";

/** Shared metadata contract for profile-gated AZURA Modules. */
export type ModuleManifest = {
  id: string;
  version: string;
  requiredCapabilities: string[];
  requiredPresets: string[];
  adminRoutes: string[];
  publicRoutes: string[];
  navItemIds: string[];
  contributedBlockTypes: BlockType[];
  permissions: string[];
};
