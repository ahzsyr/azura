import type {
  CatalogNavigationAppearance,
  CatalogNavigationBreakpointLayout,
  CatalogNavigationDisplayMode,
  CatalogNavigationHorizontalAlign,
  CatalogNavigationIconContainerStyle,
  CatalogNavigationIconPosition,
  CatalogNavigationLabelAlign,
  CatalogNavigationLayout,
  CatalogNavigationVerticalAlign,
} from "./types";

export function resolveDisplayMode(
  layout?: CatalogNavigationLayout | CatalogNavigationBreakpointLayout | null,
): CatalogNavigationDisplayMode {
  if (layout?.displayMode && layout.displayMode !== "auto") return layout.displayMode;
  if (layout?.showIcons === false) return "text";
  return "icon-text";
}

export function resolveIconPosition(
  layout?: CatalogNavigationLayout | CatalogNavigationBreakpointLayout | null,
): CatalogNavigationIconPosition {
  return layout?.iconPosition ?? "top";
}

export function resolveHorizontalAlign(
  layout?: CatalogNavigationLayout | CatalogNavigationBreakpointLayout | null,
): CatalogNavigationHorizontalAlign {
  return layout?.horizontalAlignment ?? "start";
}

export function resolveVerticalAlign(
  layout?: CatalogNavigationLayout | CatalogNavigationBreakpointLayout | null,
): CatalogNavigationVerticalAlign {
  return layout?.verticalAlignment ?? "center";
}

export function resolveLabelAlign(
  layout?: CatalogNavigationLayout | CatalogNavigationBreakpointLayout | null,
): CatalogNavigationLabelAlign {
  return layout?.labelAlignment ?? "center";
}

export function resolveIconContainerStyle(
  layout?: CatalogNavigationLayout | CatalogNavigationBreakpointLayout | null,
): CatalogNavigationIconContainerStyle {
  return layout?.iconContainerStyle ?? "none";
}

export function resolveShowTooltip(
  layout?: CatalogNavigationLayout | CatalogNavigationBreakpointLayout | null,
): boolean {
  return layout?.showTooltip !== false;
}

export function resolveAppearanceStyle(
  appearance?: CatalogNavigationAppearance | null,
): NonNullable<CatalogNavigationAppearance["appearanceStyle"]> {
  return appearance?.appearanceStyle ?? "minimal";
}

/** Merge responsive layer onto base for a forced preview breakpoint. */
export function mergeLayoutForBreakpoint(
  base: CatalogNavigationLayout | undefined,
  layer: CatalogNavigationBreakpointLayout | undefined,
): CatalogNavigationLayout & { horizontalScroll?: boolean } {
  return { ...(base ?? {}), ...(layer ?? {}) };
}

export const ICON_SIZE_PRESETS: Record<string, { iconSize: string; iconContainerSize: string }> = {
  xs: { iconSize: "14px", iconContainerSize: "24px" },
  small: { iconSize: "18px", iconContainerSize: "28px" },
  medium: { iconSize: "24px", iconContainerSize: "36px" },
  large: { iconSize: "32px", iconContainerSize: "44px" },
  xl: { iconSize: "40px", iconContainerSize: "52px" },
};

export const ITEM_HEIGHT_PRESETS: Record<string, string> = {
  auto: "auto",
  compact: "36px",
  medium: "44px",
  large: "56px",
};

export const ITEM_PADDING_PRESETS: Record<string, string> = {
  none: "0",
  compact: "6px 8px",
  comfortable: "10px 14px",
  spacious: "14px 18px",
};

export const RADIUS_PRESETS: Record<string, string> = {
  square: "0",
  small: "6px",
  medium: "12px",
  large: "16px",
  pill: "999px",
};

export const SHADOW_PRESETS: Record<string, string> = {
  none: "none",
  soft: "0 1px 3px rgba(0,0,0,0.08)",
  medium: "0 4px 14px rgba(0,0,0,0.12)",
  strong: "0 10px 28px rgba(0,0,0,0.18)",
};

export const GAP_PRESETS: Record<string, string> = {
  tight: "4px",
  normal: "8px",
  relaxed: "16px",
};
