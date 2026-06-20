import type { AdminSearchSettings } from "@/features/search/settings/admin-search-settings.schema";
import type { CSSProperties } from "react";

export type SearchModalStyleSettings = AdminSearchSettings["appearance"]["modal"];

export type ResolvedSearchModalStyle = {
  panelStyle: "solid" | "glass";
  overlayOpacity: number;
  overlayBlurPx: number;
  panelOpacity: number;
  panelBlurPx: number;
};

const DEFAULTS: ResolvedSearchModalStyle = {
  panelStyle: "solid",
  overlayOpacity: 78,
  overlayBlurPx: 16,
  panelOpacity: 98,
  panelBlurPx: 0,
};

export function resolveSearchModalStyle(
  modal?: Partial<SearchModalStyleSettings> | null
): ResolvedSearchModalStyle {
  if (!modal) return { ...DEFAULTS };
  const panelStyle = modal.panelStyle === "glass" ? "glass" : "solid";
  return {
    panelStyle,
    overlayOpacity:
      typeof modal.overlayOpacity === "number"
        ? Math.min(95, Math.max(30, modal.overlayOpacity))
        : DEFAULTS.overlayOpacity,
    overlayBlurPx:
      typeof modal.overlayBlurPx === "number"
        ? Math.min(32, Math.max(0, modal.overlayBlurPx))
        : DEFAULTS.overlayBlurPx,
    panelOpacity:
      typeof modal.panelOpacity === "number"
        ? Math.min(100, Math.max(75, modal.panelOpacity))
        : panelStyle === "glass"
          ? 92
          : DEFAULTS.panelOpacity,
    panelBlurPx:
      typeof modal.panelBlurPx === "number"
        ? Math.min(32, Math.max(0, modal.panelBlurPx))
        : panelStyle === "glass"
          ? 12
          : DEFAULTS.panelBlurPx,
  };
}

/** CSS custom properties applied on `.sm-search-root`. */
export function searchModalStyleToCssVars(
  style: ResolvedSearchModalStyle
): CSSProperties {
  return {
    ["--sm-search-overlay-opacity" as string]: String(style.overlayOpacity / 100),
    ["--sm-search-overlay-blur" as string]: `${style.overlayBlurPx}px`,
    ["--sm-search-panel-opacity" as string]: String(style.panelOpacity / 100),
    ["--sm-search-panel-blur" as string]: `${style.panelBlurPx}px`,
  } as CSSProperties;
}
