import type { SearchPagePartial } from "@/capabilities/search/lib/search-page-layout";

export type SearchPageTemplateId = "classic" | "compact" | "catalog" | "minimal";

export type SearchPageTemplatePreset = {
  id: SearchPageTemplateId;
  label: string;
  description: string;
  page: SearchPagePartial;
};

export const SEARCH_PAGE_TEMPLATE_PRESETS: SearchPageTemplatePreset[] = [
  {
    id: "classic",
    label: "Classic",
    description: "Gradient hero, sidebar filters, hover preview, rich result cards.",
    page: {
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
      resultCardStyle: "rich",
      resultCardFields: {
        image: true,
        price: true,
        rating: true,
        brand: true,
        snippet: true,
        entityLabel: true,
      },
      maxContentWidth: "lg",
    },
  },
  {
    id: "compact",
    label: "Compact",
    description: "Minimal hero, no preview pane, dense compact cards.",
    page: {
      template: "compact",
      heroStyle: "minimal",
      heroShowIcon: false,
      layout: "sidebar-only",
      sidebarMode: "auto",
      previewPane: false,
      stickySearchBar: true,
      showSaveSearch: true,
      showDiscoveryHub: true,
      showRelatedTerms: true,
      showEntityPills: true,
      showSectionHeaders: false,
      resultCardStyle: "compact",
      resultCardFields: {
        image: true,
        price: true,
        rating: false,
        brand: true,
        snippet: true,
        entityLabel: true,
      },
      maxContentWidth: "lg",
    },
  },
  {
    id: "catalog",
    label: "Catalog",
    description: "Pinned sidebar, entity pills, section headers, catalog density.",
    page: {
      template: "catalog",
      heroStyle: "gradient",
      heroShowIcon: true,
      layout: "sidebar-preview",
      sidebarMode: "pinned",
      previewPane: true,
      stickySearchBar: true,
      showSaveSearch: true,
      showDiscoveryHub: true,
      showRelatedTerms: true,
      showEntityPills: true,
      showSectionHeaders: true,
      resultCardStyle: "rich",
      resultCardFields: {
        image: true,
        price: true,
        rating: true,
        brand: true,
        snippet: true,
        entityLabel: true,
      },
      maxContentWidth: "xl",
    },
  },
  {
    id: "minimal",
    label: "Minimal",
    description: "No hero glow, stacked layout, drawer filters, discovery emphasis.",
    page: {
      template: "minimal",
      heroStyle: "none",
      heroShowIcon: false,
      layout: "stacked",
      sidebarMode: "drawer",
      previewPane: false,
      stickySearchBar: false,
      showSaveSearch: false,
      showDiscoveryHub: true,
      showRelatedTerms: false,
      showEntityPills: false,
      showSectionHeaders: true,
      resultCardStyle: "minimal",
      resultCardFields: {
        image: false,
        price: true,
        rating: false,
        brand: false,
        snippet: true,
        entityLabel: true,
      },
      maxContentWidth: "md",
    },
  },
];

export function getSearchPagePreset(id: SearchPageTemplateId): SearchPageTemplatePreset {
  return SEARCH_PAGE_TEMPLATE_PRESETS.find((p) => p.id === id) ?? SEARCH_PAGE_TEMPLATE_PRESETS[0];
}

export function applySearchPagePreset(
  current: SearchPagePartial,
  presetId: SearchPageTemplateId,
): SearchPagePartial {
  const preset = getSearchPagePreset(presetId);
  return {
    ...current,
    ...preset.page,
    template: presetId,
    titleEn: current.titleEn,
    titleAr: current.titleAr,
    subtitleEn: current.subtitleEn,
    subtitleAr: current.subtitleAr,
    bannerImage: current.bannerImage,
  };
}
