import {
  resolveProductCardDesign,
  serializeProductCardDesignForSite,
} from "@/features/products/card-design/resolve-product-card-design";
import type {
  ProductCardDesignPartial,
  ProductCardQuickViewMode,
  ProductCardResponsivePartial,
  ResolvedProductCardDesign,
} from "@/features/products/card-design/product-card-design.types";
import { designToLegacyLayoutPatch } from "@/features/products/card-design/migrate-legacy-card-layout";
import { normalizeProductCardResponsivePartial } from "@/features/products/card-design/resolve-product-card-responsive";
import {
  resolveProductCardLayout,
  serializeProductCardLayoutForSite,
  type ResolvedProductCardLayout,
} from "@/features/products/lib/product-storefront-layout";
import type { ProductCardAppearanceConfig } from "./product-card-appearance.types";

export function resolveQuickViewModeFromParts(
  layout: ResolvedProductCardLayout,
  design: ResolvedProductCardDesign,
): ProductCardQuickViewMode {
  if (design.quickViewMode) return design.quickViewMode;
  const hasQuickViewAction = design.actions.enabledTypes.includes("quick_view");
  if (!hasQuickViewAction && !layout.showQuickAction) return "disabled";
  if (layout.showQuickAction) return "hover_overlay";
  if (hasQuickViewAction) return "action_button";
  return "disabled";
}

export function applyQuickViewMode(
  mode: ProductCardQuickViewMode,
  layout: ResolvedProductCardLayout,
  design: ResolvedProductCardDesign,
): { layout: ResolvedProductCardLayout; design: ResolvedProductCardDesign } {
  const enabledTypes = new Set(design.actions.enabledTypes);
  switch (mode) {
    case "disabled":
      enabledTypes.delete("quick_view");
      return {
        layout: { ...layout, showQuickAction: false },
        design: {
          ...design,
          quickViewMode: mode,
          actions: { ...design.actions, enabledTypes: [...enabledTypes] },
        },
      };
    case "hover_overlay":
      enabledTypes.add("quick_view");
      return {
        layout: { ...layout, showQuickAction: true },
        design: {
          ...design,
          quickViewMode: mode,
          actions: { ...design.actions, enabledTypes: [...enabledTypes] },
        },
      };
    case "action_button":
      enabledTypes.add("quick_view");
      return {
        layout: { ...layout, showQuickAction: false },
        design: {
          ...design,
          quickViewMode: mode,
          actions: { ...design.actions, enabledTypes: [...enabledTypes] },
        },
      };
    default:
      return { layout, design };
  }
}

function syncBadgePosition(
  design: ResolvedProductCardDesign,
  layout: ResolvedProductCardLayout,
): ResolvedProductCardLayout {
  const pos = design.badgePosition;
  if (pos === "top-left" || pos === "top-right") {
    return { ...layout, badgePosition: pos };
  }
  return layout;
}

function stripVisibilityFromLayout(layout: ResolvedProductCardLayout): ResolvedProductCardLayout {
  return {
    ...layout,
    showCompare: true,
    showBrand: true,
    showDiscountBadge: true,
  };
}

export function appearanceConfigFromParts(
  design: ResolvedProductCardDesign,
  layout: ResolvedProductCardLayout,
  responsive?: ProductCardResponsivePartial | null,
): ProductCardAppearanceConfig {
  const quickViewMode = resolveQuickViewModeFromParts(layout, design);
  const mergedDesign: ResolvedProductCardDesign = {
    ...design,
    quickViewMode,
    inheritThemePreset: design.inheritThemePreset ?? layout.inheritThemePreset,
  };
  const syncedLayout = syncBadgePosition(mergedDesign, stripVisibilityFromLayout(layout));
  const { layout: finalLayout, design: finalDesign } = applyQuickViewMode(
    quickViewMode,
    syncedLayout,
    mergedDesign,
  );

  return {
    design: finalDesign,
    layout: {
      ...finalLayout,
      hoverBehavior:
        finalDesign.hoverEffect === "lift" ||
        finalDesign.hoverEffect === "glow" ||
        finalDesign.hoverEffect === "scale_image" ||
        finalDesign.hoverEffect === "none"
          ? finalDesign.hoverEffect
          : finalLayout.hoverBehavior,
      inheritThemePreset: finalDesign.inheritThemePreset,
    },
    responsive: responsive ?? {},
  };
}

export function appearanceConfigFromSite(input: {
  productCardDesign?: unknown;
  productCardLayout?: unknown;
  productCardDesignResponsive?: unknown;
}): ProductCardAppearanceConfig {
  const layout = resolveProductCardLayout(
    input.productCardLayout as Parameters<typeof resolveProductCardLayout>[0],
  );
  const design = resolveProductCardDesign({
    partial: input.productCardDesign as ProductCardDesignPartial | undefined,
    legacyLayout: layout,
  });
  const responsive = normalizeProductCardResponsivePartial(input.productCardDesignResponsive);
  return appearanceConfigFromParts(design, layout, responsive);
}

export function serializeProductCardResponsiveForSite(
  responsive: ProductCardResponsivePartial,
): ProductCardResponsivePartial | undefined {
  const out: ProductCardResponsivePartial = {};
  const layers = ["desktop", "tablet", "mobile", "smallMobile"] as const;
  for (const layer of layers) {
    const partial = responsive[layer];
    if (!partial) continue;
    const serialized = serializeProductCardDesignForSite(
      resolveProductCardDesign({ partial }),
    );
    if (Object.keys(serialized).length > 0) {
      out[layer] = serialized;
    }
  }
  return Object.keys(out).length ? out : undefined;
}

export function appearanceConfigToSiteSettings(config: ProductCardAppearanceConfig): {
  productCardDesign: ProductCardDesignPartial;
  productCardLayout: ReturnType<typeof serializeProductCardLayoutForSite>;
  productCardDesignResponsive: ProductCardResponsivePartial | null;
} {
  const legacyPatch = designToLegacyLayoutPatch(config.design, config.layout);
  const layoutForSave = stripVisibilityFromLayout({
    ...config.layout,
    ...legacyPatch,
    ...syncBadgePosition(config.design, config.layout),
    inheritThemePreset: config.design.inheritThemePreset,
  });

  const { layout: quickLayout, design: quickDesign } = applyQuickViewMode(
    config.design.quickViewMode,
    layoutForSave,
    config.design,
  );

  return {
    productCardDesign: serializeProductCardDesignForSite(quickDesign),
    productCardLayout: serializeProductCardLayoutForSite(quickLayout),
    productCardDesignResponsive: serializeProductCardResponsiveForSite(config.responsive) ?? null,
  };
}
