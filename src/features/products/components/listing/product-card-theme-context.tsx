"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import type { ProductCardTheme } from "@/features/products/lib/product-card-theme";
import {
  mergeProductCardDisplayOverrides,
  resolveProductCardDisplay,
  type ProductCardDisplayOverrides,
  type ResolvedProductCardDisplay,
} from "@/features/products/lib/product-card-display";
import { defaultProductCardTheme } from "@/features/products/lib/product-card-theme";
import { useProductPageViewport } from "@/features/products/lib/product-pdp-breakpoints";
import type { ProductCardVariant } from "@/features/products/lib/product-card-variant";

type ProductCardThemeContextValue = ProductCardTheme & {
  displayOverrides: ProductCardDisplayOverrides;
  cardVariant: ProductCardVariant;
  effectiveCardDisplay: ResolvedProductCardDisplay;
};

const ProductCardThemeContext = createContext<ProductCardThemeContextValue | null>(null);

function resolveEffectiveCardDisplay(
  theme: ProductCardTheme,
  viewport: ReturnType<typeof useProductPageViewport>,
  displayOverrides: ProductCardDisplayOverrides,
): ResolvedProductCardDisplay {
  const cardDisplay = resolveProductCardDisplay(
    theme.elementsRules[viewport].display,
    theme.cardLayout,
    theme.buyNow,
    theme.quoteCta,
  );
  return mergeProductCardDisplayOverrides(cardDisplay, displayOverrides);
}

export type ProductCardThemeProviderProps = {
  theme: ProductCardTheme;
  displayOverrides?: ProductCardDisplayOverrides;
  cardVariant?: ProductCardVariant;
  children: ReactNode;
};

export function ProductCardThemeProvider({
  theme,
  displayOverrides = {},
  cardVariant = "default",
  children,
}: ProductCardThemeProviderProps) {
  const viewport = useProductPageViewport();
  const value = useMemo<ProductCardThemeContextValue>(
    () => ({
      ...theme,
      displayOverrides,
      cardVariant,
      effectiveCardDisplay: resolveEffectiveCardDisplay(theme, viewport, displayOverrides),
    }),
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
    return {
      ...fallback,
      displayOverrides: {},
      cardVariant: "default",
      effectiveCardDisplay: resolveEffectiveCardDisplay(fallback, viewport, {}),
    };
  }
  return ctx;
}

export function useProductCardDisplayOverrides(): ProductCardDisplayOverrides {
  return useProductCardTheme().displayOverrides;
}
