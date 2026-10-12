import { documentationModuleManifest } from "@/modules/documentation/manifest";
import { statusPageModuleManifest } from "@/modules/status-page/manifest";
import { marketingModuleManifest } from "@/modules/marketing/manifest";

/** Preset → admin href prefixes and public URL segments (locale-stripped). */
export const PRESET_ROUTE_REGISTRY: Record<
  string,
  { adminPrefixes: string[]; publicSegments: string[] }
> = {
  product: {
    adminPrefixes: [
      "/admin/products",
      "/admin/categories",
      "/admin/collections",
      "/admin/catalog-taxonomy",
      "/admin/catalog",
      "/admin/product-listing-filters",
    ],
    publicSegments: ["products", "categories", "collections", "compare", "brands", "tags"],
  },
  service: {
    adminPrefixes: ["/admin/content/offerings"],
    publicSegments: ["services"],
  },
  destination: {
    adminPrefixes: ["/admin/content/catalog-items"],
    publicSegments: ["packages"],
  },
  property: {
    adminPrefixes: ["/admin/content/listings"],
    publicSegments: [],
  },
  project: {
    adminPrefixes: ["/admin/content/projects"],
    publicSegments: [],
  },
  "case-study": {
    adminPrefixes: ["/admin/content/case-studies"],
    publicSegments: [],
  },
  "team-member": {
    adminPrefixes: ["/admin/team"],
    publicSegments: ["team"],
  },
  partner: {
    adminPrefixes: ["/admin/partners"],
    publicSegments: ["partners"],
  },
  knowledge: {
    adminPrefixes: ["/admin/knowledge-base"],
    publicSegments: [],
  },
  pricing: {
    adminPrefixes: ["/admin/pricing-plans", "/admin/pricing-calculators"],
    publicSegments: [],
  },
  release: {
    adminPrefixes: ["/admin/releases"],
    publicSegments: [],
  },
};

export const MODULE_MANIFESTS = [
  documentationModuleManifest,
  statusPageModuleManifest,
  marketingModuleManifest,
] as const;

/** Route gating is derived from the same manifests used by module and block code. */
export const MODULE_ROUTE_REGISTRY: Record<
  string,
  { adminPrefixes: string[]; publicPrefixes: string[]; apiPrefixes: string[] }
> = Object.fromEntries(
  MODULE_MANIFESTS.map((manifest) => [
    manifest.id,
    {
      adminPrefixes: manifest.adminRoutes,
      publicPrefixes: manifest.publicRoutes.filter((route) => !route.startsWith("/api/")),
      apiPrefixes: manifest.publicRoutes.filter((route) => route.startsWith("/api/")),
    },
  ]),
);

export function getModuleManifests() {
  return MODULE_MANIFESTS;
}

export function getModuleForContributedBlock(blockType: string): string | undefined {
  return MODULE_MANIFESTS.find((manifest) =>
    (manifest.contributedBlockTypes as readonly string[]).includes(blockType),
  )?.id;
}

export const PRESET_API_PREFIXES: Record<string, string[]> = {
  product: ["/api/products", "/api/categories", "/api/collections", "/api/categories/sync", "/api/sync-collections"],
};

export const ALL_KNOWN_PRESETS = Object.keys(PRESET_ROUTE_REGISTRY);
export const ALL_KNOWN_MODULES = Object.keys(MODULE_ROUTE_REGISTRY);
