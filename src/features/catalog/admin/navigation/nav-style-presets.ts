import type {
  CatalogNavigationAppearance,
  CatalogNavigationBreakpointLayout,
  CatalogNavigationLayout,
} from "@/features/catalog/navigation/types";
import {
  GAP_PRESETS,
  ICON_SIZE_PRESETS,
  ITEM_PADDING_PRESETS,
  RADIUS_PRESETS,
  SHADOW_PRESETS,
} from "@/features/catalog/navigation/layout-semantics";

export type AppearanceStylePresetId = "minimal" | "pills" | "elevated" | "underline" | "custom";

export type LayoutQuickPresetId =
  | "icon-text-standard"
  | "icon-only-compact"
  | "text-only"
  | "categories-equal";

export function applyAppearanceStylePreset(
  id: AppearanceStylePresetId,
  current: CatalogNavigationAppearance | undefined,
): CatalogNavigationAppearance {
  const base: CatalogNavigationAppearance = {
    ...(current ?? {}),
    appearanceStyle: id,
  };

  switch (id) {
    case "minimal":
      return {
        ...base,
        theme: current?.theme ?? "inherit",
        background: undefined,
        border: "transparent",
        borderRadius: RADIUS_PRESETS.small,
        shadow: SHADOW_PRESETS.none,
        activeBackground: "color-mix(in srgb, var(--foreground, #111) 7%, transparent)",
        activeForeground: undefined,
        hoverBackground: "color-mix(in srgb, var(--foreground, #111) 4%, transparent)",
        hoverForeground: undefined,
        foreground: undefined,
      };
    case "pills":
      return {
        ...base,
        theme: "custom",
        background: "transparent",
        border: "transparent",
        borderRadius: RADIUS_PRESETS.pill,
        shadow: SHADOW_PRESETS.none,
        activeBackground: "#111827",
        activeForeground: "#FFFFFF",
        hoverBackground: "#F3F4F6",
        hoverForeground: "#111827",
        foreground: "#374151",
      };
    case "elevated":
      return {
        ...base,
        theme: "custom",
        background: "#FFFFFF",
        border: "#E5E7EB",
        borderRadius: RADIUS_PRESETS.medium,
        shadow: SHADOW_PRESETS.soft,
        activeBackground: "#F3F4F6",
        activeForeground: "#111827",
        hoverBackground: "#F9FAFB",
        hoverForeground: "#111827",
        foreground: "#374151",
      };
    case "underline":
      return {
        ...base,
        theme: current?.theme ?? "inherit",
        background: "transparent",
        border: "transparent",
        borderRadius: RADIUS_PRESETS.square,
        shadow: SHADOW_PRESETS.none,
        activeBackground: "transparent",
        activeForeground: undefined,
        hoverBackground: "transparent",
        hoverForeground: undefined,
        foreground: undefined,
      };
    case "custom":
    default:
      return { ...base, appearanceStyle: "custom" };
  }
}

/** Layout tweaks often paired with appearance style presets. */
export function layoutPatchForAppearanceStyle(
  id: AppearanceStylePresetId,
): Partial<CatalogNavigationLayout> {
  switch (id) {
    case "pills":
      return {
        itemPadding: "8px 16px",
        gap: GAP_PRESETS.normal,
        iconPosition: "left",
        displayMode: "icon-text",
      };
    case "elevated":
      return {
        paddingX: "12px",
        paddingY: "8px",
        itemPadding: ITEM_PADDING_PRESETS.comfortable,
        gap: GAP_PRESETS.normal,
      };
    case "underline":
      return {
        itemPadding: "8px 10px",
        gap: GAP_PRESETS.relaxed,
        iconPosition: "left",
      };
    case "minimal":
    default:
      return {
        gap: GAP_PRESETS.tight,
        itemPadding: ITEM_PADDING_PRESETS.compact,
      };
  }
}

export function applyLayoutQuickPreset(
  id: LayoutQuickPresetId,
  opts?: { forMobile?: boolean },
): CatalogNavigationBreakpointLayout {
  const mobile = opts?.forMobile === true;

  switch (id) {
    case "icon-only-compact":
      return {
        displayMode: "icon",
        iconPosition: "top",
        showIcons: true,
        showTooltip: true,
        itemWidth: mobile ? "44px" : "44px",
        itemHeight: "auto",
        itemPadding: "8px",
        itemMargin: "0",
        gap: GAP_PRESETS.normal,
        horizontalAlignment: "start",
        verticalAlignment: "center",
        labelAlignment: "center",
        iconContainerStyle: "none",
        ...ICON_SIZE_PRESETS.medium,
        iconLabelGap: "0",
        overflowMode: "scroll-bar",
      };
    case "text-only":
      return {
        displayMode: "text",
        showIcons: false,
        itemWidth: "auto",
        itemHeight: "auto",
        itemPadding: ITEM_PADDING_PRESETS.compact,
        itemMargin: "0",
        gap: GAP_PRESETS.tight,
        horizontalAlignment: "start",
        labelAlignment: "left",
        overflowMode: mobile ? "scroll-bar" : "scroll-bar",
      };
    case "categories-equal":
      return {
        displayMode: "icon-text",
        iconPosition: "top",
        showIcons: true,
        itemWidth: "equal",
        itemHeight: "auto",
        itemPadding: ITEM_PADDING_PRESETS.comfortable,
        itemMargin: "0",
        gap: GAP_PRESETS.normal,
        horizontalAlignment: "center",
        verticalAlignment: "center",
        labelAlignment: "center",
        ...ICON_SIZE_PRESETS.medium,
        iconLabelGap: "6px",
        overflowMode: mobile ? "scroll-bar" : "scroll-bar",
      };
    case "icon-text-standard":
    default:
      return {
        displayMode: "icon-text",
        iconPosition: mobile ? "top" : "left",
        showIcons: true,
        showTooltip: true,
        itemWidth: "auto",
        itemHeight: "auto",
        itemPadding: ITEM_PADDING_PRESETS.comfortable,
        itemMargin: "0",
        gap: GAP_PRESETS.normal,
        horizontalAlignment: "start",
        verticalAlignment: "center",
        labelAlignment: "center",
        iconContainerStyle: "none",
        ...ICON_SIZE_PRESETS.medium,
        iconLabelGap: "8px",
        overflowMode: mobile ? "scroll-bar" : "scroll-bar",
      };
  }
}

/** Factory for Appearance → Restore defaults. */
export function defaultCatalogNavigationAppearance(): CatalogNavigationAppearance {
  return applyAppearanceStylePreset("minimal", { theme: "inherit" });
}

/** Factory for Layout → Restore defaults (current breakpoint). */
export function defaultCatalogNavigationLayout(
  opts?: { forMobile?: boolean },
): CatalogNavigationBreakpointLayout {
  return applyLayoutQuickPreset("icon-text-standard", opts);
}

export type LayoutDensityId = "tight" | "normal" | "relaxed";
export type LayoutSizeId = "compact" | "medium" | "large";
export type LayoutIconSizeId = keyof typeof ICON_SIZE_PRESETS;

const DENSITY_PRESETS: Record<
  LayoutDensityId,
  Pick<CatalogNavigationBreakpointLayout, "gap" | "itemPadding" | "iconLabelGap">
> = {
  tight: {
    gap: GAP_PRESETS.tight,
    itemPadding: ITEM_PADDING_PRESETS.compact,
    iconLabelGap: "4px",
  },
  normal: {
    gap: GAP_PRESETS.normal,
    itemPadding: ITEM_PADDING_PRESETS.comfortable,
    iconLabelGap: "8px",
  },
  relaxed: {
    gap: GAP_PRESETS.relaxed,
    itemPadding: ITEM_PADDING_PRESETS.spacious,
    iconLabelGap: "10px",
  },
};

const SIZE_PRESETS: Record<
  LayoutSizeId,
  Pick<
    CatalogNavigationBreakpointLayout,
    "itemHeight" | "iconSize" | "iconContainerSize"
  >
> = {
  compact: {
    itemHeight: "auto",
    ...ICON_SIZE_PRESETS.small,
  },
  medium: {
    itemHeight: "auto",
    ...ICON_SIZE_PRESETS.medium,
  },
  large: {
    itemHeight: "auto",
    ...ICON_SIZE_PRESETS.large,
  },
};

export function layoutPatchForDensity(id: LayoutDensityId): Partial<CatalogNavigationBreakpointLayout> {
  return { ...DENSITY_PRESETS[id] };
}

export function layoutPatchForSize(id: LayoutSizeId): Partial<CatalogNavigationBreakpointLayout> {
  return { ...SIZE_PRESETS[id] };
}

export function layoutPatchForIconSize(
  id: LayoutIconSizeId,
): Partial<CatalogNavigationBreakpointLayout> {
  return { ...ICON_SIZE_PRESETS[id] };
}

export function matchLayoutIconSize(
  layout: CatalogNavigationBreakpointLayout,
): LayoutIconSizeId | "custom" {
  const icon = layout.iconSize;
  if (!icon) return "medium";
  for (const [id, preset] of Object.entries(ICON_SIZE_PRESETS) as Array<
    [LayoutIconSizeId, { iconSize: string; iconContainerSize: string }]
  >) {
    if (preset.iconSize === icon) return id;
  }
  return "custom";
}

export function matchLayoutDensity(
  layout: CatalogNavigationBreakpointLayout,
): LayoutDensityId | "custom" {
  const gap = layout.gap ?? GAP_PRESETS.normal;
  if (gap === GAP_PRESETS.tight) return "tight";
  if (gap === GAP_PRESETS.relaxed) return "relaxed";
  if (gap === GAP_PRESETS.normal) return "normal";
  return "custom";
}

export function matchLayoutSize(
  layout: CatalogNavigationBreakpointLayout,
): LayoutSizeId | "custom" {
  const icon = layout.iconSize;
  if (icon === ICON_SIZE_PRESETS.small.iconSize) return "compact";
  if (icon === ICON_SIZE_PRESETS.large.iconSize) return "large";
  if (icon === ICON_SIZE_PRESETS.xl.iconSize) return "large";
  if (icon === ICON_SIZE_PRESETS.xs.iconSize) return "compact";
  if (!icon || icon === ICON_SIZE_PRESETS.medium.iconSize) return "medium";
  return "custom";
}

/** Best-effort match for highlighting the active quick-layout card. */
export function matchLayoutQuickPreset(
  layout: CatalogNavigationBreakpointLayout,
): LayoutQuickPresetId | null {
  if (layout.displayMode === "icon") return "icon-only-compact";
  if (layout.displayMode === "text" || layout.showIcons === false) return "text-only";
  if (layout.itemWidth === "equal") return "categories-equal";
  if (
    layout.displayMode === "icon-text" ||
    layout.displayMode === "auto" ||
    layout.displayMode == null
  ) {
    return "icon-text-standard";
  }
  return null;
}
