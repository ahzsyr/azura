"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import {
  resolveProductPageDisplay,
  type ProductPageDisplayPartial,
  type ResolvedProductPageDisplay,
  type ResolvedProductPageElementOrder,
} from "@/features/products/lib/product-page-display";
import type { ResolvedProductPageCompactDisplay } from "@/features/products/lib/product-page-compact-display";
import {
  useProductPageViewport,
  type ProductPageViewport,
} from "@/features/products/lib/product-pdp-breakpoints";
import {
  buildProductPageLayoutConfigFromElementsRules,
  resolveViewportLayout,
  type ResolvedProductLayout,
  ProductPageElementsRules,
  ProductPageLayoutRules,
} from "@/features/products/lib/product-page-responsive";
import type { ResolvedProductPageOverflow } from "@/features/products/lib/product-page-overflow";
import type { ResolvedProductPageLayout } from "@/features/products/lib/product-storefront-layout";

export type ProductPageResponsiveSnapshot = {
  viewport: ProductPageViewport;
  layout: ResolvedProductPageLayout;
  display: ResolvedProductPageDisplay;
  elementOrder: ResolvedProductPageElementOrder;
  compactDisplay: ResolvedProductPageCompactDisplay;
  resolvedLayout: ResolvedProductLayout;
  overflow: ResolvedProductPageOverflow;
};

const ProductPageResponsiveContext = createContext<ProductPageResponsiveSnapshot | null>(null);

export function ProductPageResponsiveProvider({
  layoutRules,
  elementsRules,
  productDisplayPartial,
  overflow,
  children,
}: {
  layoutRules: ProductPageLayoutRules;
  elementsRules: ProductPageElementsRules;
  productDisplayPartial?: ProductPageDisplayPartial | null;
  overflow: ResolvedProductPageOverflow;
  children: ReactNode;
}) {
  const viewport = useProductPageViewport();

  const value = useMemo((): ProductPageResponsiveSnapshot => {
    const layer = elementsRules[viewport];
    const display = resolveProductPageDisplay(layer.display, productDisplayPartial);
    const effectiveElementsRules = {
      ...elementsRules,
      [viewport]: {
        ...layer,
        display,
      },
    };
    const layoutConfig = buildProductPageLayoutConfigFromElementsRules(effectiveElementsRules);
    return {
      viewport,
      layout: layoutRules[viewport],
      display,
      elementOrder: layer.elementOrder,
      compactDisplay: layer.compactDisplay,
      resolvedLayout: resolveViewportLayout(layoutConfig, viewport),
      overflow,
    };
  }, [viewport, layoutRules, elementsRules, productDisplayPartial, overflow]);

  return (
    <ProductPageResponsiveContext.Provider value={value}>
      {children}
    </ProductPageResponsiveContext.Provider>
  );
}

export function useProductPageResponsive(): ProductPageResponsiveSnapshot {
  const ctx = useContext(ProductPageResponsiveContext);
  if (!ctx) {
    throw new Error("useProductPageResponsive must be used within ProductPageResponsiveProvider");
  }
  return ctx;
}

/** SSR-safe defaults (desktop layer) before hydration. */
export function desktopProductPageSnapshot(
  layoutRules: ProductPageLayoutRules,
  elementsRules: ProductPageElementsRules,
  overflow: ResolvedProductPageOverflow,
  productDisplayPartial?: ProductPageDisplayPartial | null,
): ProductPageResponsiveSnapshot {
  const layer = elementsRules.desktop;
  const display = resolveProductPageDisplay(layer.display, productDisplayPartial);
  const effectiveElementsRules = {
    ...elementsRules,
    desktop: {
      ...layer,
      display,
    },
  };
  const layoutConfig = buildProductPageLayoutConfigFromElementsRules(effectiveElementsRules);
  return {
    viewport: "desktop",
    layout: layoutRules.desktop,
    display,
    elementOrder: layer.elementOrder,
    compactDisplay: layer.compactDisplay,
    resolvedLayout: resolveViewportLayout(layoutConfig, "desktop"),
    overflow,
  };
}
