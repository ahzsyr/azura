import type { ModuleManifest } from "@/modules/module-manifest";

/** Canonical module manifest — documentation portal. */
export const DOCUMENTATION_MODULE_ID = "documentation" as const;
export const documentationModuleManifest = {
  id: DOCUMENTATION_MODULE_ID,
  version: "1.0.0",
  packageKind: "app",
  azuraCompatibility: ">=0.1.0",
  requiredPackages: [],
  label: "Documentation",
  requiredCapabilities: ["search", "versioning", "workflow"],
  requiredPresets: ["knowledge"],
  adminRoutes: ["/admin/documentation"],
  publicRoutes: ["/docs"],
  navItemIds: ["documentation"],
  contributedBlockTypes: ["documentationNav"],
  permissions: ["documentation.read", "documentation.manage"],
} satisfies ModuleManifest;
