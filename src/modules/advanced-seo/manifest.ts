import type { ModuleManifest } from "@/modules/module-manifest";

/** Canonical module manifest — Advanced SEO admin write surfaces (Option A). */
export const ADVANCED_SEO_MODULE_ID = "advanced-seo" as const;

export const advancedSeoModuleManifest = {
  id: ADVANCED_SEO_MODULE_ID,
  version: "1.0.0",
  packageKind: "app",
  azuraCompatibility: ">=0.1.0",
  requiredPackages: [],
  label: "Advanced SEO",
  requiredCapabilities: [],
  requiredPresets: [],
  /** Never include `/admin/seo` — that would take Basic SEO down when omitted. */
  adminRoutes: [
    "/admin/seo/templates",
    "/admin/seo/metadata",
    "/admin/seo/schemas",
    "/admin/seo/rules",
    "/admin/seo/google",
    "/admin/seo/404",
    "/admin/seo/search-operations",
    "/admin/seo/search-intelligence",
  ],
  publicRoutes: [],
  navItemIds: [
    "seo-templates",
    "seo-metadata",
    "seo-schemas",
    "seo-rules",
    "seo-google",
    "seo-404",
    "seo-search-operations",
    "seo-search-intelligence",
    "seo-so-automation",
    "seo-si-entity-graph",
    "seo-si-schema",
    "seo-si-linking",
    "seo-si-content",
    "seo-si-authority",
    "seo-si-performance",
    "seo-si-ai",
    "seo-so-operations",
    "seo-so-pages",
    "seo-so-entities",
    "seo-so-content",
    "seo-so-google",
    "seo-so-monitoring",
    "seo-so-settings",
  ],
  contributedBlockTypes: [],
  permissions: ["advanced-seo.read", "advanced-seo.manage"],
} satisfies ModuleManifest;
