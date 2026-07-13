"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import type { ProductCardContentSlot } from "@/features/products/card-design/product-card-design.types";
import type { ResolvedProductCardDesign } from "@/features/products/card-design/product-card-design.types";
import type { ProductCardTheme } from "@/features/products/lib/product-card-theme";
import {
  mergeProductCardDisplayOverrides,
  resolveProductCardDisplay,
  type ProductCardDisplayOverrides,
  type ResolvedProductCardDisplay,
} from "@/features/products/lib/product-card-display";
import { defaultProductCardTheme } from "@/features/products/lib/product-card-theme";
import {
  useProductPageViewport,
  type ProductPageViewport,
} from "@/features/products/lib/product-pdp-breakpoints";
import { resolveEffectiveCardDesignState } from "@/features/products/lib/resolve-effective-card-design";
import type { ProductCardVariant } from "@/features/products/lib/product-card-variant";

type ProductCardThemeContextValue = ProductCardTheme & {
  displayOverrides: ProductCardDisplayOverrides;
  cardVariant: ProductCardVariant;
  effectiveCardDisplay: ResolvedProductCardDisplay;
  effectiveDesign: ResolvedProductCardDesign;
  effectiveDesignTokens: Record<string, string>;
  effectiveDesignDataAttrs: Record<string, string>;
  effectiveContentOrder: ProductCardContentSlot[];
};

const ProductCardThemeContext = createContext<ProductCardThemeContextValue | null>(null);

function resolveEffectiveCardDisplay(
  theme: ProductCardTheme,
  viewport: ProductPageViewport,
  displayOverrides: ProductCardDisplayOverrides,
): ResolvedProductCardDisplay {
  const cardDisplay = resolveProductCardDisplay(
    theme.elementsRules[viewport].display,
    theme.cardLayout,
    theme.buyNow,
    theme.productCta,
  );
  return mergeProductCardDisplayOverrides(cardDisplay, displayOverrides);
}

function buildThemeContextValue(
  theme: ProductCardTheme,
  viewport: ProductPageViewport,
  displayOverrides: ProductCardDisplayOverrides,
  cardVariant: ProductCardVariant,
): ProductCardThemeContextValue {
  const effectiveDesignState = resolveEffectiveCardDesignState({
    design: theme.design,
    responsive: theme.responsive,
    cardLayout: theme.cardLayout,
    viewport,
  });

  return {
    ...theme,
    displayOverrides,
    cardVariant,
    effectiveCardDisplay: resolveEffectiveCardDisplay(theme, viewport, displayOverrides),
    effectiveDesign: effectiveDesignState.design,
    effectiveDesignTokens: effectiveDesignState.designTokens,
    effectiveDesignDataAttrs: effectiveDesignState.designDataAttrs,
    effectiveContentOrder: effectiveDesignState.contentOrder,
  };
}

export type ProductCardThemeProviderProps = {
  theme: ProductCardTheme;
  displayOverrides?: ProductCardDisplayOverrides;
  cardVariant?: ProductCardVariant;
  viewportOverride?: ProductPageViewport;
  children: ReactNode;
};

export function ProductCardThemeProvider({
  theme,
  displayOverrides = {},
  cardVariant = "default",
  viewportOverride,
  children,
}: ProductCardThemeProviderProps) {
  const liveViewport = useProductPageViewport();
  const viewport = viewportOverride ?? liveViewport;
  const value = useMemo<ProductCardThemeContextValue>(
    () => buildThemeContextValue(theme, viewport, displayOverrides, cardVariant),
    [theme, viewport, displayOverrides, cardVariant],
  );

  return (
    <ProductCardThemeContext.Provider value={value}>{children}</ProductCardThemeContext.Provider>
  );
}

export function useProductCardTheme(): ProductCardThemeContextValue {
  const ctx = useContext(ProductCardThemeContext);
  const viewport = useProductPageViewport();
  if (!ctx) {
    const fallback = defaultProductCardTheme();
    return buildThemeContextValue(fallback, viewport, {}, "default");
  }
  return ctx;
}

export function useOptionalProductCardTheme(): ProductCardThemeContextValue | null {
  return useContext(ProductCardThemeContext);
}

export function useProductCardDisplayOverrides(): ProductCardDisplayOverrides {
  return useProductCardTheme().displayOverrides;
}
