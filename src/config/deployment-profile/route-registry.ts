/** Preset → admin href prefixes and public URL segments (locale-stripped). */
export const PRESET_ROUTE_REGISTRY: Record<
  string,
  { adminPrefixes: string[]; publicSegments: string[] }
> = {
  product: {
    adminPrefixes: ["/admin/products", "/admin/collections", "/admin/catalog-taxonomy"],
    publicSegments: ["products", "collections", "compare", "brands", "tags"],
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

export const MODULE_ROUTE_REGISTRY: Record<string, { adminPrefixes: string[] }> = {
  documentation: { adminPrefixes: ["/admin/documentation"] },
  "status-page": { adminPrefixes: ["/admin/status"] },
  "enterprise-translation": { adminPrefixes: [] },
  "advanced-seo": { adminPrefixes: [] },
};

export const PRESET_API_PREFIXES: Record<string, string[]> = {
  product: ["/api/products", "/api/collections", "/api/sync-collections"],
};

export const ALL_KNOWN_PRESETS = Object.keys(PRESET_ROUTE_REGISTRY);
export const ALL_KNOWN_MODULES = Object.keys(MODULE_ROUTE_REGISTRY);
