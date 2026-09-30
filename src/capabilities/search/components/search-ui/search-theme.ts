import type { AdminSearchSettings } from "@/capabilities/search/settings/admin-search-settings.schema";
import type { SearchInputStyle } from "./search-input-shell";
import {
  resolveSearchModalStyle,
  searchModalStyleToCssVars,
  type ResolvedSearchModalStyle,
} from "./search-modal-style";
import type { SearchPanelWidth } from "./search-theme-root";

export type SearchThemeAppearance = {
  inheritGlobalTheme: boolean;
  inputStyle: SearchInputStyle;
  panelWidth: SearchPanelWidth;
  modal: ResolvedSearchModalStyle;
  modalCssVars: ReturnType<typeof searchModalStyleToCssVars>;
};

export function resolveSearchThemeAppearance(
  appearance: AdminSearchSettings["appearance"]
): SearchThemeAppearance {
  const modal = resolveSearchModalStyle(appearance.modal);
  return {
    inheritGlobalTheme: appearance.inheritGlobalTheme !== false,
    inputStyle: appearance.inputStyle,
    panelWidth: appearance.panelWidth,
    modal,
    modalCssVars: searchModalStyleToCssVars(modal),
  };
}
