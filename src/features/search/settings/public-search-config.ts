import type { AdminSearchSettings } from "@/features/search/settings/admin-search-settings.schema";
import { resolveSearchThemeAppearance } from "@/features/search/components/search-ui/search-theme";
import type { SearchInputStyle } from "@/features/search/components/search-ui/search-input-shell";
import type { ResolvedSearchModalStyle } from "@/features/search/components/search-ui/search-modal-style";
import type { SearchPanelWidth } from "@/features/search/components/search-ui/search-theme-root";
import type { ResolvedSearchFilterDef } from "@/features/search/settings/resolve-search-filters";
import { resolveSearchFilters } from "@/features/search/settings/resolve-search-filters";
import {
  resolvePublicAutocompleteConfig,
  type PublicAutocompleteConfig,
} from "@/features/search/settings/search-autocomplete-config";

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
  mode: AdminSearchSettings["general"]["mode"];
  placeholder: string;
  inheritGlobalTheme: boolean;
  inputStyle: SearchInputStyle;
  panelWidth: SearchPanelWidth;
  modal: ResolvedSearchModalStyle;
  filters: PublicSearchFilterDef[];
  showEntityTypeChips: boolean;
  autocomplete: PublicAutocompleteConfig;
};

export type PublicSearchFilterDef = Pick<
  ResolvedSearchFilterDef,
  "id" | "labelEn" | "labelAr" | "uiType" | "builtin" | "facetKeys"
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
    mode: g.mode,
    placeholder: settings.appearance.placeholder,
    ...resolveSearchThemeAppearance(settings.appearance),
    ...(() => {
      const f = resolveSearchFilters(settings.filters);
      return {
        filters: f.filters.map((x) => ({
          id: x.id,
          labelEn: x.labelEn,
          labelAr: x.labelAr,
          uiType: x.uiType,
          builtin: x.builtin,
          facetKeys: x.facetKeys,
        })),
        showEntityTypeChips: f.showEntityTypeChips,
      };
    })(),
    autocomplete: resolvePublicAutocompleteConfig(settings.autocomplete),
  };
}
