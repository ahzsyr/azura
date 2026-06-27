import { z } from "zod";
import { STANDARD_SEARCH_INDEX_FIELDS } from "@/capabilities/search/engine/indexing/search-index-field-keys";
import {
  DEFAULT_RANKING_PRIORITY_ORDER,
  DEFAULT_RANKING_WEIGHTS,
  SEARCH_RANKING_SIGNALS,
} from "@/capabilities/search/settings/search-ranking-signals";
import {
  DEFAULT_FILTER_DISPLAY_ORDER,
  searchFilterUiTypeSchema,
} from "@/capabilities/search/settings/search-filter-keys";
import { searchSmartSchema } from "@/capabilities/search/settings/search-smart.schema";

const emptyToUndefined = (v: unknown) => (v === "" || v === null ? undefined : v);

export const searchModeSchema = z.enum(["basic", "advanced", "fuzzy", "hybrid"]);
export type SearchMode = z.infer<typeof searchModeSchema>;

export const SEARCH_MODE_OPTIONS: { value: SearchMode; label: string; description: string }[] = [
  { value: "basic", label: "Basic", description: "Substring (LIKE) matching only." },
  { value: "advanced", label: "Advanced", description: "MySQL FULLTEXT when eligible; LIKE fallback otherwise." },
  { value: "fuzzy", label: "Fuzzy", description: "LIKE with typo-tolerant ranking." },
  { value: "hybrid", label: "Hybrid", description: "FULLTEXT + LIKE merge (recommended)." },
];

export const searchGeneralSchema = z.object({
  enabled: z.boolean().default(true),
  globalSearchEnabled: z.boolean().default(true),
  searchPageEnabled: z.boolean().default(false),
  searchPagePath: z.preprocess(
    (v) => (typeof v === "string" && !v.trim() ? undefined : v),
    z.string().min(1).default("/search"),
  ),
  resultsPerPage: z.number().min(5).max(100).default(20),
  instantSearch: z.boolean().default(true),
  debounceMs: z.number().min(0).max(800).default(280),
  minQueryLength: z.number().min(1).max(6).default(2),
  maxResults: z.number().min(8).max(80).default(20),
  mode: z.preprocess(emptyToUndefined, searchModeSchema.default("hybrid")),
});

export type SearchGeneralSettings = z.infer<typeof searchGeneralSchema>;

export const searchFuzzinessLabelSchema = z.enum(["strict", "balanced", "fuzzy"]);
export const searchInputStyleSchema = z.enum(["glass", "solid", "minimal"]);
export const searchPanelWidthSchema = z.enum(["sm", "md", "lg", "xl"]);
export const searchHeaderLayoutSchema = z.enum(["inline", "icon-floating", "floating-header"]);
export const searchShortcutSchema = z.enum(["/", "none"]);

export const searchCatalogSourcesSchema = z.object({
  products: z.boolean().default(true),
  collections: z.boolean().default(true),
  categories: z.boolean().default(true),
});

/** Admin-facing searchable source toggles (Search Sources tab). */
export const searchSourcesSchema = z.object({
  products: z.boolean().default(true),
  packages: z.boolean().default(true),
  listings: z.boolean().default(true),
  offerings: z.boolean().default(true),
  projects: z.boolean().default(true),
  collections: z.boolean().default(true),
  pages: z.boolean().default(true),
  posts: z.boolean().default(true),
  media: z.boolean().default(false),
  /** Master switch for DB content types not covered by built-in toggles. */
  customContentTypes: z.boolean().default(true),
  /** Per-slug overrides for custom (and optional built-in) content types. */
  contentTypeSlugs: z.record(z.string(), z.boolean()).default({}),
  /** Index content type landing / archive pages. */
  contentTypeLandings: z.boolean().default(true),
  faqs: z.boolean().default(true),
  testimonials: z.boolean().default(true),
});

export type SearchSourcesSettings = z.infer<typeof searchSourcesSchema>;

/** @deprecated Use searchSourcesSchema — kept for type compatibility during migration. */
export const searchEntitySourcesSchema = searchSourcesSchema;

export const searchRankingWeightsSchema = z.object({
  title: z.number().min(0).max(10).default(DEFAULT_RANKING_WEIGHTS.title),
  description: z.number().min(0).max(10).default(DEFAULT_RANKING_WEIGHTS.description),
  tags: z.number().min(0).max(10).default(DEFAULT_RANKING_WEIGHTS.tags),
  category: z.number().min(0).max(10).default(DEFAULT_RANKING_WEIGHTS.category),
  collection: z.number().min(0).max(10).default(DEFAULT_RANKING_WEIGHTS.collection),
  customField: z.number().min(0).max(10).default(DEFAULT_RANKING_WEIGHTS.customField),
  popularity: z.number().min(0).max(10).default(DEFAULT_RANKING_WEIGHTS.popularity),
  featured: z.number().min(0).max(10).default(DEFAULT_RANKING_WEIGHTS.featured),
  recent: z.number().min(0).max(10).default(DEFAULT_RANKING_WEIGHTS.recent),
});

export const searchRankingSchema = z.object({
  weights: searchRankingWeightsSchema.default({ ...DEFAULT_RANKING_WEIGHTS }),
  priorityOrder: z
    .array(z.enum(SEARCH_RANKING_SIGNALS))
    .default([...DEFAULT_RANKING_PRIORITY_ORDER]),
  /** @deprecated Use weights.title */
  titleFieldWeight: z.number().min(0).max(10).optional(),
  enableTypoTolerance: z.boolean().default(true),
  arabicLikeFallback: z.boolean().default(false),
  fullTextMinLength: z.number().min(1).max(6).default(2),
});

export type SearchRankingSettings = z.infer<typeof searchRankingSchema>;

export const searchCustomFieldFilterSchema = z.object({
  enabled: z.boolean().default(true),
  fieldKey: z.string(),
  contentTypeSlug: z.string(),
  facetKey: z.string(),
  label: z.string(),
  uiType: searchFilterUiTypeSchema.default("chip"),
});

export type SearchCustomFieldFilter = z.infer<typeof searchCustomFieldFilterSchema>;

export const searchFiltersSchema = z.object({
  showEntityTypeChips: z.boolean().default(true),
  showContentTypeChips: z.boolean().default(true),
  defaultEntityTypes: z.array(z.string()).default([]),
  /** Built-in filter toggles by id (category, collection, …). */
  builtin: z
    .record(z.string(), z.object({ enabled: z.boolean().default(true) }))
    .default({}),
  displayOrder: z.array(z.string()).default([...DEFAULT_FILTER_DISPLAY_ORDER]),
  customFields: z.record(z.string(), searchCustomFieldFilterSchema).default({}),
});

export type SearchFiltersSettings = z.infer<typeof searchFiltersSchema>;

export const searchAutocompleteSchema = z.object({
  /** @deprecated Prefer general.debounceMs; kept for legacy site.json */
  debounceMs: z.number().min(0).max(800).optional(),
  maxResults: z.number().min(8).max(80).optional(),
  instantSuggestions: z.boolean().default(true),
  suggestDebounceMs: z.number().min(0).max(800).default(200),
  suggestMinLength: z.number().min(0).max(4).default(1),
  suggestLimit: z.number().min(4).max(20).default(8),
  showRecent: z.boolean().default(true),
  showPopular: z.boolean().default(true),
  showTrending: z.boolean().default(true),
  showHistory: z.boolean().default(true),
  showSuggestions: z.boolean().default(true),
  showResultPreviews: z.boolean().default(true),
  groupResults: z.boolean().default(true),
  keyboardNavigation: z.boolean().default(true),
  recentLimit: z.number().min(3).max(20).default(8),
  historyLimit: z.number().min(10).max(200).default(50),
  popularQueries: z.array(z.string()).default([]),
  trendingQueries: z.array(z.string()).default([]),
  recordTrending: z.boolean().default(true),
});

export type SearchAutocompleteSettings = z.infer<typeof searchAutocompleteSchema>;

export const searchModalStyleSchema = z.object({
  /** Solid = opaque panel (readable). Glass = frosted panel using theme glass tokens. */
  panelStyle: z.preprocess(emptyToUndefined, z.enum(["solid", "glass"]).default("solid")),
  /** Backdrop dim strength (30–95). Higher = less background bleed-through. */
  overlayOpacity: z.number().min(30).max(95).default(78),
  overlayBlurPx: z.number().min(0).max(32).default(16),
  /** Panel surface opacity (75–100). */
  panelOpacity: z.number().min(75).max(100).default(98),
  panelBlurPx: z.number().min(0).max(32).default(0),
});

export type SearchModalStyleSettings = z.infer<typeof searchModalStyleSchema>;

export const searchPageTemplateSchema = z.enum(["classic", "compact", "catalog", "minimal"]);
export const searchPageHeroStyleSchema = z.enum(["gradient", "minimal", "banner", "none"]);
export const searchPageLayoutSchema = z.enum(["sidebar-preview", "sidebar-only", "stacked"]);
export const searchPageSidebarModeSchema = z.enum(["pinned", "drawer", "auto"]);
export const searchResultCardStyleSchema = z.enum(["rich", "compact", "minimal"]);
export const searchPageMaxWidthSchema = z.enum(["md", "lg", "xl", "full"]);
export const searchResultTypeSchema = z.enum([
  "CONTENT_TYPE",
  "CONTENT_COLLECTION",
  "CONTENT_ITEM",
  "CATALOG_PRODUCT",
  "CATALOG_COLLECTION",
  "CATALOG_CATEGORY",
  "CMS_PAGE",
  "POST",
  "FAQ",
  "TESTIMONIAL",
  "MEDIA",
  "TEAM_MEMBER",
  "PARTNER",
]);

export const searchResultCardFieldsSchema = z.object({
  image: z.boolean().default(true),
  price: z.boolean().default(true),
  rating: z.boolean().default(true),
  brand: z.boolean().default(true),
  snippet: z.boolean().default(true),
  entityLabel: z.boolean().default(true),
});

export const searchResultTypeDisplaySchema = z.object({
  enabled: z.boolean().default(true),
});

export const searchPageDesignSchema = z.object({
  template: z.preprocess(emptyToUndefined, searchPageTemplateSchema.default("classic")),
  heroStyle: z.preprocess(emptyToUndefined, searchPageHeroStyleSchema.default("gradient")),
  heroShowIcon: z.boolean().default(true),
  layout: z.preprocess(emptyToUndefined, searchPageLayoutSchema.default("sidebar-preview")),
  sidebarMode: z.preprocess(emptyToUndefined, searchPageSidebarModeSchema.default("pinned")),
  previewPane: z.boolean().default(true),
  stickySearchBar: z.boolean().default(true),
  showSaveSearch: z.boolean().default(true),
  showDiscoveryHub: z.boolean().default(true),
  showRelatedTerms: z.boolean().default(true),
  showEntityPills: z.boolean().default(false),
  showSectionHeaders: z.boolean().default(true),
  resultTypeOrder: z.array(searchResultTypeSchema).default([...searchResultTypeSchema.options]),
  resultTypes: z.record(z.string(), searchResultTypeDisplaySchema).default({}),
  resultCardStyle: z.preprocess(emptyToUndefined, searchResultCardStyleSchema.default("rich")),
  resultCardFields: searchResultCardFieldsSchema.default({}),
  maxContentWidth: z.preprocess(emptyToUndefined, searchPageMaxWidthSchema.default("lg")),
  title: z.string().default(""),
  subtitle: z.string().default(""),
  bannerImage: z.string().default(""),
});

export type SearchPageDesignSettings = z.infer<typeof searchPageDesignSchema>;

export const searchModalElementsSchema = z.object({
  showRecent: z.boolean().default(true),
  showPopular: z.boolean().default(true),
  showTrending: z.boolean().default(true),
  showHistory: z.boolean().default(true),
  showEntityGroups: z.boolean().default(true),
  showResultSnippets: z.boolean().default(true),
  showViewAllFooter: z.boolean().default(true),
  showFilterBar: z.boolean().default(true),
  showKeyboardHints: z.boolean().default(true),
  maxResultsPerType: z.number().min(3).max(8).default(5),
});

export type SearchModalElementsSettings = z.infer<typeof searchModalElementsSchema>;

export const searchAppearanceSchema = z.object({
  /** When true, search UI uses global Theme System tokens (colors, preset glass, motion). */
  inheritGlobalTheme: z.boolean().default(true),
  modal: searchModalStyleSchema.default({}),
  publicHeaderLayout: z.preprocess(
    emptyToUndefined,
    searchHeaderLayoutSchema.default("icon-floating"),
  ),
  inputStyle: z.preprocess(emptyToUndefined, searchInputStyleSchema.default("minimal")),
  panelWidth: z.preprocess(emptyToUndefined, searchPanelWidthSchema.default("lg")),
  placeholder: z.preprocess(
    (v) => (typeof v === "string" && !v.trim() ? undefined : v),
    z.string().default("Search catalog, blog, pages…"),
  ),
  showShortcutBadge: z.boolean().default(true),
  keyboardShortcut: z.preprocess(emptyToUndefined, searchShortcutSchema.default("/")),
  showInHeader: z.boolean().default(true),
  showOnMobile: z.boolean().default(true),
  page: searchPageDesignSchema.default({}),
  modalElements: searchModalElementsSchema.default({}),
});

export const searchAnalyticsSchema = z.object({
  enabled: z.boolean().default(false),
  logQueries: z.boolean().default(false),
  logZeroResults: z.boolean().default(true),
  recordClicks: z.boolean().default(true),
  recordFilters: z.boolean().default(true),
  retentionDays: z.number().min(7).max(365).default(90),
});

export const searchAdminSearchSchema = z.object({
  /** Include media assets in admin panel search (indexed as admin-only). */
  includeMedia: z.boolean().default(true),
  /** Future: index draft/unpublished content for admin search. */
  includeUnpublished: z.boolean().default(false),
});

export const searchPerformanceSchema = z.object({
  syncCatalogOnProductIndex: z.boolean().default(true),
  skipLikeWhenFullText: z.boolean().default(false),
  mediaIndexLimit: z.number().min(0).max(5000).default(500),
  maxRetrievalCandidates: z.number().min(20).max(120).default(120),
  indexBodyMaxChars: z.number().min(2000).max(24000).default(12000),
  queryCacheEnabled: z.boolean().default(true),
  queryCacheTtlSec: z.number().min(5).max(300).default(45),
  indexConcurrency: z.number().min(1).max(16).default(8),
});

export const adminSearchSettingsSchema = z.object({
  general: searchGeneralSchema.default({}),
  /** Mirrors `general.enabled` for legacy site.json and APIs. */
  enabled: z.boolean().default(true),
  fuzziness: z.union([searchFuzzinessLabelSchema, z.number()]).optional(),
  catalog: searchCatalogSourcesSchema.default({}),
  sources: searchSourcesSchema.default({}),
  ranking: searchRankingSchema.default({}),
  filters: searchFiltersSchema.default({}),
  autocomplete: searchAutocompleteSchema.default({}),
  smart: searchSmartSchema.default({}),
  appearance: searchAppearanceSchema.default({}),
  adminSearch: searchAdminSearchSchema.default({}),
  analytics: searchAnalyticsSchema.default({}),
  performance: searchPerformanceSchema.default({}),
  /** Legacy numeric fuzziness 0–1 (catalog listing) */
  listingFuzziness: z.number().min(0.1).max(0.6).optional(),
});

export type SearchPerformanceSettings = z.infer<typeof searchPerformanceSchema>;
export type AdminSearchSettings = z.infer<typeof adminSearchSettingsSchema>;

export const SEARCH_SETTINGS_TAB_IDS = [
  "general",
  "sources",
  "ranking",
  "filters",
  "autocomplete",
  "smart",
  "appearance",
  "analytics",
  "performance",
] as const;

export type SearchSettingsTabId = (typeof SEARCH_SETTINGS_TAB_IDS)[number];

export const SEARCH_SETTINGS_TABS: { id: SearchSettingsTabId; label: string }[] = [
  { id: "general", label: "General" },
  { id: "sources", label: "Search Sources" },
  { id: "ranking", label: "Ranking" },
  { id: "filters", label: "Filters" },
  { id: "autocomplete", label: "Autocomplete" },
  { id: "smart", label: "Smart Search" },
  { id: "appearance", label: "Appearance" },
  { id: "analytics", label: "Analytics" },
  { id: "performance", label: "Performance" },
];

export const STANDARD_INDEX_FIELD_LABELS: Record<string, string> = Object.fromEntries(
  STANDARD_SEARCH_INDEX_FIELDS.map((k) => [k, k.replace(/_/g, " ")])
);
