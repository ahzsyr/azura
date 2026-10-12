import type { ModuleManifest } from "@/modules/module-manifest";

/** Canonical module manifest — marketing integrations hub. */
export const MARKETING_MODULE_ID = "marketing" as const;
export const marketingModuleManifest = {
  id: MARKETING_MODULE_ID,
  version: "1.0.0",
  requiredCapabilities: ["analytics"],
  requiredPresets: [],
  adminRoutes: ["/admin/marketing"],
  publicRoutes: ["/api/marketing"],
  navItemIds: [
    "marketing-dashboard", "marketing-campaigns", "marketing-ad-accounts", "marketing-platforms",
    "marketing-attribution", "marketing-conversions", "marketing-leads", "marketing-landing-pages",
    "marketing-urls", "marketing-analytics", "marketing-tracking", "marketing-automation",
    "marketing-integrations", "marketing-settings", "marketing-publishing",
  ],
  contributedBlockTypes: [],
  permissions: ["marketing.read", "marketing.manage"],
} satisfies ModuleManifest;
