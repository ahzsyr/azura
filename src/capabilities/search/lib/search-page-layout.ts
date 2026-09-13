import type { CSSProperties } from "react";
import type { SearchEntityType } from "@prisma/client";
import type { SearchPageTemplateId } from "@/capabilities/search/lib/search-page-presets";
import { pickLocaleField } from "@/features/builder/blocks/content/lib/locale-field";
import { SEARCH_ENTITY_TYPES } from "@/capabilities/search/constants";

export type SearchPageHeroStyle = "gradient" | "minimal" | "banner" | "none";
export type SearchPageLayout = "sidebar-preview" | "sidebar-only" | "stacked";
export type SearchPageSidebarMode = "pinned" | "drawer" | "auto";
export type SearchResultCardStyle = "rich" | "compact" | "minimal";
export type SearchPageMaxWidth = "md" | "lg" | "xl" | "full";

export type SearchResultCardFields = {
  image: boolean;
  price: boolean;
  rating: boolean;
  brand: boolean;
  snippet: boolean;
  entityLabel: boolean;
};

export type SearchResultTypeDisplay = {
  enabled: boolean;
};

export type SearchPagePartial = {
  template?: SearchPageTemplateId;
  heroStyle?: SearchPageHeroStyle;
  heroShowIcon?: boolean;
  layout?: SearchPageLayout;
  sidebarMode?: SearchPageSidebarMode;
  previewPane?: boolean;
  stickySearchBar?: boolean;
  showSaveSearch?: boolean;
  showDiscoveryHub?: boolean;
  showRelatedTerms?: boolean;
  showEntityPills?: boolean;
  showSectionHeaders?: boolean;
  resultTypeOrder?: SearchEntityType[];
  resultTypes?: Partial<Record<SearchEntityType, Partial<SearchResultTypeDisplay>>>;
  resultCardStyle?: SearchResultCardStyle;
  resultCardFields?: Partial<SearchResultCardFields>;
  maxContentWidth?: SearchPageMaxWidth;
  titleEn?: string;
  titleAr?: string;
  subtitleEn?: string;
  subtitleAr?: string;
  bannerImage?: string;
};

export type ResolvedSearchPageLayout = {
  template: SearchPageTemplateId;
  heroStyle: SearchPageHeroStyle;
  heroShowIcon: boolean;
  layout: SearchPageLayout;
  sidebarMode: SearchPageSidebarMode;
  previewPane: boolean;
  stickySearchBar: boolean;
  showSaveSearch: boolean;
  showDiscoveryHub: boolean;
  showRelatedTerms: boolean;
  showEntityPills: boolean;
  showSectionHeaders: boolean;
  resultTypeOrder: SearchEntityType[];
  resultTypes: Record<SearchEntityType, SearchResultTypeDisplay>;
  resultCardStyle: SearchResultCardStyle;
  resultCardFields: SearchResultCardFields;
  maxContentWidth: SearchPageMaxWidth;
  titleEn: string;
  titleAr: string;
  subtitleEn: string;
  subtitleAr: string;
  bannerImage: string;
};

export type SearchModalElementsPartial = {
  showRecent?: boolean;
  showPopular?: boolean;
  showTrending?: boolean;
  showHistory?: boolean;
  showEntityGroups?: boolean;
  showResultSnippets?: boolean;
  showViewAllFooter?: boolean;
  showFilterBar?: boolean;
  showKeyboardHints?: boolean;
  maxResultsPerType?: number;
};

export type ResolvedSearchModalElements = {
  showRecent: boolean;
  showPopular: boolean;
  showTrending: boolean;
  showHistory: boolean;
  showEntityGroups: boolean;
  showResultSnippets: boolean;
  showViewAllFooter: boolean;
  showFilterBar: boolean;
  showKeyboardHints: boolean;
  maxResultsPerType: number;
};

const CARD_FIELDS_DEFAULTS: SearchResultCardFields = {
  image: true,
  price: true,
  rating: true,
  brand: true,
  snippet: true,
  entityLabel: true,
};

const RESULT_TYPE_DEFAULTS = Object.fromEntries(
  SEARCH_ENTITY_TYPES.map((type) => [type, { enabled: true }])
) as Record<SearchEntityType, SearchResultTypeDisplay>;

const PAGE_DEFAULTS: ResolvedSearchPageLayout = {
  template: "classic",
  heroStyle: "gradient",
  heroShowIcon: true,
  layout: "sidebar-preview",
  sidebarMode: "pinned",
  previewPane: true,
  stickySearchBar: true,
  showSaveSearch: true,
  showDiscoveryHub: true,
  showRelatedTerms: true,
  showEntityPills: false,
  showSectionHeaders: true,
  resultTypeOrder: [...SEARCH_ENTITY_TYPES],
  resultTypes: { ...RESULT_TYPE_DEFAULTS },
  resultCardStyle: "rich",
  resultCardFields: { ...CARD_FIELDS_DEFAULTS },
  maxContentWidth: "lg",
  titleEn: "",
  titleAr: "",
  subtitleEn: "",
  subtitleAr: "",
  bannerImage: "",
};

const MODAL_ELEMENTS_DEFAULTS: ResolvedSearchModalElements = {
  showRecent: true,
  showPopular: true,
  showTrending: true,
  showHistory: true,
  showEntityGroups: true,
  showResultSnippets: true,
  showViewAllFooter: true,
  showFilterBar: true,
  showKeyboardHints: true,
  maxResultsPerType: 5,
};

function isTemplate(v: unknown): v is SearchPageTemplateId {
  return v === "classic" || v === "compact" || v === "catalog" || v === "minimal";
}
function isHeroStyle(v: unknown): v is SearchPageHeroStyle {
  return v === "gradient" || v === "minimal" || v === "banner" || v === "none";
}
function isLayout(v: unknown): v is SearchPageLayout {
  return v === "sidebar-preview" || v === "sidebar-only" || v === "stacked";
}
function isSidebarMode(v: unknown): v is SearchPageSidebarMode {
  return v === "pinned" || v === "drawer" || v === "auto";
}
function isCardStyle(v: unknown): v is SearchResultCardStyle {
  return v === "rich" || v === "compact" || v === "minimal";
}
function isMaxWidth(v: unknown): v is SearchPageMaxWidth {
  return v === "md" || v === "lg" || v === "xl" || v === "full";
}
function isSearchEntityType(v: unknown): v is SearchEntityType {
  return typeof v === "string" && SEARCH_ENTITY_TYPES.includes(v as SearchEntityType);
}

export function normalizeSearchPagePartial(raw: unknown): SearchPagePartial | undefined {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return undefined;
  const o = raw as Record<string, unknown>;
  const out: SearchPagePartial = {};

  if (isTemplate(o.template)) out.template = o.template;
  if (isHeroStyle(o.heroStyle)) out.heroStyle = o.heroStyle;
  if (typeof o.heroShowIcon === "boolean") out.heroShowIcon = o.heroShowIcon;
  if (isLayout(o.layout)) out.layout = o.layout;
  if (isSidebarMode(o.sidebarMode)) out.sidebarMode = o.sidebarMode;
  if (typeof o.previewPane === "boolean") out.previewPane = o.previewPane;
  if (typeof o.stickySearchBar === "boolean") out.stickySearchBar = o.stickySearchBar;
  if (typeof o.showSaveSearch === "boolean") out.showSaveSearch = o.showSaveSearch;
  if (typeof o.showDiscoveryHub === "boolean") out.showDiscoveryHub = o.showDiscoveryHub;
  if (typeof o.showRelatedTerms === "boolean") out.showRelatedTerms = o.showRelatedTerms;
  if (typeof o.showEntityPills === "boolean") out.showEntityPills = o.showEntityPills;
  if (typeof o.showSectionHeaders === "boolean") out.showSectionHeaders = o.showSectionHeaders;
  if (Array.isArray(o.resultTypeOrder)) {
    const order = o.resultTypeOrder.filter(isSearchEntityType);
    if (order.length) out.resultTypeOrder = Array.from(new Set(order));
  }
  if (o.resultTypes && typeof o.resultTypes === "object" && !Array.isArray(o.resultTypes)) {
    const rawResultTypes = o.resultTypes as Record<string, unknown>;
    const resultTypes: Partial<Record<SearchEntityType, Partial<SearchResultTypeDisplay>>> = {};
    for (const [key, value] of Object.entries(rawResultTypes)) {
      if (!isSearchEntityType(key) || !value || typeof value !== "object" || Array.isArray(value)) {
        continue;
      }
      const enabled = (value as Record<string, unknown>).enabled;
      if (typeof enabled === "boolean") resultTypes[key] = { enabled };
    }
    if (Object.keys(resultTypes).length) out.resultTypes = resultTypes;
  }
  if (isCardStyle(o.resultCardStyle)) out.resultCardStyle = o.resultCardStyle;
  if (typeof o.maxContentWidth === "string" && isMaxWidth(o.maxContentWidth)) {
    out.maxContentWidth = o.maxContentWidth;
  }
  if (typeof o.titleEn === "string") out.titleEn = o.titleEn;
  if (typeof o.titleAr === "string") out.titleAr = o.titleAr;
  if (typeof o.subtitleEn === "string") out.subtitleEn = o.subtitleEn;
  if (typeof o.subtitleAr === "string") out.subtitleAr = o.subtitleAr;
  if (typeof o.bannerImage === "string") out.bannerImage = o.bannerImage;

  if (o.resultCardFields && typeof o.resultCardFields === "object" && !Array.isArray(o.resultCardFields)) {
    const f = o.resultCardFields as Record<string, unknown>;
    const fields: Partial<SearchResultCardFields> = {};
    for (const key of Object.keys(CARD_FIELDS_DEFAULTS) as (keyof SearchResultCardFields)[]) {
      if (typeof f[key] === "boolean") fields[key] = f[key];
    }
    if (Object.keys(fields).length) out.resultCardFields = fields;
  }

  return Object.keys(out).length ? out : undefined;
}

export function normalizeSearchModalElementsPartial(
  raw: unknown,
): SearchModalElementsPartial | undefined {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return undefined;
  const o = raw as Record<string, unknown>;
  const out: SearchModalElementsPartial = {};

  if (typeof o.showRecent === "boolean") out.showRecent = o.showRecent;
  if (typeof o.showPopular === "boolean") out.showPopular = o.showPopular;
  if (typeof o.showTrending === "boolean") out.showTrending = o.showTrending;
  if (typeof o.showHistory === "boolean") out.showHistory = o.showHistory;
  if (typeof o.showEntityGroups === "boolean") out.showEntityGroups = o.showEntityGroups;
  if (typeof o.showResultSnippets === "boolean") out.showResultSnippets = o.showResultSnippets;
  if (typeof o.showViewAllFooter === "boolean") out.showViewAllFooter = o.showViewAllFooter;
  if (typeof o.showFilterBar === "boolean") out.showFilterBar = o.showFilterBar;
  if (typeof o.showKeyboardHints === "boolean") out.showKeyboardHints = o.showKeyboardHints;
  if (typeof o.maxResultsPerType === "number") out.maxResultsPerType = o.maxResultsPerType;

  return Object.keys(out).length ? out : undefined;
}

export function resolveSearchPageLayout(partial?: SearchPagePartial): ResolvedSearchPageLayout {
  const p = partial ?? {};
  const resultTypeOrder = [...(p.resultTypeOrder ?? PAGE_DEFAULTS.resultTypeOrder)].filter(
    isSearchEntityType,
  );
  for (const type of SEARCH_ENTITY_TYPES) {
    if (!resultTypeOrder.includes(type)) resultTypeOrder.push(type);
  }
  const resultTypes = Object.fromEntries(
    SEARCH_ENTITY_TYPES.map((type) => [
      type,
      {
        enabled: p.resultTypes?.[type]?.enabled ?? PAGE_DEFAULTS.resultTypes[type].enabled,
      },
    ]),
  ) as Record<SearchEntityType, SearchResultTypeDisplay>;

  return {
    template: p.template ?? PAGE_DEFAULTS.template,
    heroStyle: p.heroStyle ?? PAGE_DEFAULTS.heroStyle,
    heroShowIcon: p.heroShowIcon ?? PAGE_DEFAULTS.heroShowIcon,
    layout: p.layout ?? PAGE_DEFAULTS.layout,
    sidebarMode: p.sidebarMode ?? PAGE_DEFAULTS.sidebarMode,
    previewPane: p.previewPane ?? PAGE_DEFAULTS.previewPane,
    stickySearchBar: p.stickySearchBar ?? PAGE_DEFAULTS.stickySearchBar,
    showSaveSearch: p.showSaveSearch ?? PAGE_DEFAULTS.showSaveSearch,
    showDiscoveryHub: p.showDiscoveryHub ?? PAGE_DEFAULTS.showDiscoveryHub,
    showRelatedTerms: p.showRelatedTerms ?? PAGE_DEFAULTS.showRelatedTerms,
    showEntityPills: p.showEntityPills ?? PAGE_DEFAULTS.showEntityPills,
    showSectionHeaders: p.showSectionHeaders ?? PAGE_DEFAULTS.showSectionHeaders,
    resultTypeOrder,
    resultTypes,
    resultCardStyle: p.resultCardStyle ?? PAGE_DEFAULTS.resultCardStyle,
    resultCardFields: { ...CARD_FIELDS_DEFAULTS, ...p.resultCardFields },
    maxContentWidth: p.maxContentWidth ?? PAGE_DEFAULTS.maxContentWidth,
    titleEn: p.titleEn ?? PAGE_DEFAULTS.titleEn,
    titleAr: p.titleAr ?? PAGE_DEFAULTS.titleAr,
    subtitleEn: p.subtitleEn ?? PAGE_DEFAULTS.subtitleEn,
    subtitleAr: p.subtitleAr ?? PAGE_DEFAULTS.subtitleAr,
    bannerImage: p.bannerImage ?? PAGE_DEFAULTS.bannerImage,
  };
}

export function resolveSearchModalElements(
  partial?: SearchModalElementsPartial,
): ResolvedSearchModalElements {
  const p = partial ?? {};
  const maxResultsPerType =
    typeof p.maxResultsPerType === "number"
      ? Math.min(8, Math.max(3, p.maxResultsPerType))
      : MODAL_ELEMENTS_DEFAULTS.maxResultsPerType;

  return {
    showRecent: p.showRecent ?? MODAL_ELEMENTS_DEFAULTS.showRecent,
    showPopular: p.showPopular ?? MODAL_ELEMENTS_DEFAULTS.showPopular,
    showTrending: p.showTrending ?? MODAL_ELEMENTS_DEFAULTS.showTrending,
    showHistory: p.showHistory ?? MODAL_ELEMENTS_DEFAULTS.showHistory,
    showEntityGroups: p.showEntityGroups ?? MODAL_ELEMENTS_DEFAULTS.showEntityGroups,
    showResultSnippets: p.showResultSnippets ?? MODAL_ELEMENTS_DEFAULTS.showResultSnippets,
    showViewAllFooter: p.showViewAllFooter ?? MODAL_ELEMENTS_DEFAULTS.showViewAllFooter,
    showFilterBar: p.showFilterBar ?? MODAL_ELEMENTS_DEFAULTS.showFilterBar,
    showKeyboardHints: p.showKeyboardHints ?? MODAL_ELEMENTS_DEFAULTS.showKeyboardHints,
    maxResultsPerType,
  };
}

const MAX_WIDTH_PX: Record<SearchPageMaxWidth, string> = {
  md: "48rem",
  lg: "72rem",
  xl: "var(--site-page-max-width)",
  full: "100%",
};

export function searchPageLayoutCssVars(layout: ResolvedSearchPageLayout): CSSProperties {
  const heroHeight =
    layout.heroStyle === "none" ? "0" : layout.heroStyle === "minimal" ? "8rem" : "18rem";

  return {
    ["--sm-search-page-max-width" as string]: MAX_WIDTH_PX[layout.maxContentWidth],
    ["--sm-search-page-hero-height" as string]: heroHeight,
  } as CSSProperties;
}

export function searchPageLayoutClassNames(layout: ResolvedSearchPageLayout): string {
  const parts = [
    `sm-search-page--hero-${layout.heroStyle}`,
    `sm-search-page--layout-${layout.layout}`,
    `sm-search-page--width-${layout.maxContentWidth}`,
    `sm-search-page--cards-${layout.resultCardStyle}`,
  ];
  if (!layout.previewPane) parts.push("sm-search-page--no-preview");
  if (!layout.stickySearchBar) parts.push("sm-search-page--no-sticky-search");
  return parts.join(" ");
}

export function resolveSearchPageCopy(
  layout: ResolvedSearchPageLayout,
  locale: string,
  defaults: { title: string; subtitle: string },
): { title: string; subtitle: string } {
  const layoutRecord = layout as Record<string, unknown>;
  const title = pickLocaleField(layoutRecord, "title", locale) || defaults.title;
  const subtitle = pickLocaleField(layoutRecord, "subtitle", locale) || defaults.subtitle;
  return { title, subtitle };
}

/** Whether desktop sidebar should be shown (pinned/auto on lg+). */
export function searchPageShowDesktopSidebar(layout: ResolvedSearchPageLayout): boolean {
  return layout.layout !== "stacked" && layout.sidebarMode !== "drawer";
}

/** Filter drawer trigger in page header (mobile / compact filter access). */
export function searchPageShowFilterDrawer(): boolean {
  return true;
}
