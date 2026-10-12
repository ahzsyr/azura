import type { ModuleManifest } from "@/modules/module-manifest";

/** Canonical module manifest — public status page. */
export const STATUS_PAGE_MODULE_ID = "status-page" as const;
export const statusPageModuleManifest = {
  id: STATUS_PAGE_MODULE_ID,
  version: "1.0.0",
  packageKind: "app",
  azuraCompatibility: ">=0.1.0",
  requiredPackages: [],
  label: "Status Page",
  requiredCapabilities: [],
  requiredPresets: [],
  adminRoutes: ["/admin/status"],
  publicRoutes: ["/status", "/api/status-boards"],
  navItemIds: ["status-page"],
  contributedBlockTypes: ["statusDashboard"],
  permissions: ["status.read", "status.manage"],
} satisfies ModuleManifest;
