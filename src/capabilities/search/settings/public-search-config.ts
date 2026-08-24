import type { AdminSearchSettings } from "@/capabilities/search/settings/admin-search-settings.schema";
import type { ProductSearchCardDisplay } from "@/features/products/lib/product-search-display";
import { resolveSearchThemeAppearance } from "@/capabilities/search/components/search-ui/search-theme";
import type { SearchInputStyle } from "@/capabilities/search/components/search-ui/search-input-shell";
import type { ResolvedSearchModalStyle } from "@/capabilities/search/components/search-ui/search-modal-style";
import type { SearchPanelWidth } from "@/capabilities/search/components/search-ui/search-theme-root";
import type { ResolvedSearchFilterDef } from "@/capabilities/search/settings/resolve-search-filters";
import { resolveSearchFilters } from "@/capabilities/search/settings/resolve-search-filters";
import {
  resolvePublicAutocompleteConfig,
  type PublicAutocompleteConfig,
} from "@/capabilities/search/settings/search-autocomplete-config";
import {
  resolveSearchPageLayout,
  resolveSearchModalElements,
  type ResolvedSearchPageLayout,
  type ResolvedSearchModalElements,
} from "@/capabilities/search/lib/search-page-layout";

export type { ResolvedSearchPageLayout, ResolvedSearchModalElements };

export type { PublicAutocompleteConfig };

/** Client-safe search config exposed via API. */
export type PublicSearchConfig = {
  enabled: boolean;
  globalSearchEnabled: boolean;
  searchPageEnabled: boolean;
  searchPagePath: string;
  resultsPerPage: number;
  instantSearch: boolean;
  debounceMs: number;
  minQueryLength: number;
  maxResults: number;
  enterKeyAction: AdminSearchSettings["general"]["enterKeyAction"];
  mode: AdminSearchSettings["general"]["mode"];
  placeholder: string;
  inheritGlobalTheme: boolean;
  inputStyle: SearchInputStyle;
  panelWidth: SearchPanelWidth;
  modal: ResolvedSearchModalStyle;
  filters: PublicSearchFilterDef[];
  showEntityTypeChips: boolean;
  autocomplete: PublicAutocompleteConfig;
  page: ResolvedSearchPageLayout;
  modalElements: ResolvedSearchModalElements;
  /** Site-default product card visibility for search result cards. */
  productSearchCardDisplay?: ProductSearchCardDisplay;
};

export type PublicSearchFilterDef = Pick<
  ResolvedSearchFilterDef,
  "id" | "label" | "uiType" | "builtin" | "facetKeys"
>;

export function toPublicSearchConfig(settings: AdminSearchSettings): PublicSearchConfig {
  const g = settings.general;
  return {
    enabled: g.enabled,
    globalSearchEnabled: g.globalSearchEnabled,
    searchPageEnabled: g.searchPageEnabled,
    searchPagePath: g.searchPagePath,
    resultsPerPage: g.resultsPerPage,
    instantSearch: g.instantSearch,
    debounceMs: g.debounceMs,
    minQueryLength: g.minQueryLength,
    maxResults: g.maxResults,
    enterKeyAction: g.enterKeyAction,
    mode: g.mode,
    placeholder: settings.appearance.placeholder,
    ...resolveSearchThemeAppearance(settings.appearance),
    ...(() => {
      const f = resolveSearchFilters(settings.filters);
      return {
        filters: f.filters.map((x) => ({
          id: x.id,
          label: x.label,
          uiType: x.uiType,
          builtin: x.builtin,
          facetKeys: x.facetKeys,
        })),
        showEntityTypeChips: f.showEntityTypeChips,
      };
    })(),
    autocomplete: resolvePublicAutocompleteConfig(settings.autocomplete),
    page: resolveSearchPageLayout(settings.appearance.page),
    modalElements: resolveSearchModalElements(settings.appearance.modalElements),
  };
}
