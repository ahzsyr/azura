"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import type { ProductCardTheme } from "@/features/products/lib/product-card-theme";
import {
  mergeProductCardDisplayOverrides,
  type ProductCardDisplayOverrides,
  type ResolvedProductCardDisplay,
} from "@/features/products/lib/product-card-display";
import { defaultProductCardTheme } from "@/features/products/lib/product-card-theme";
import type { ProductCardVariant } from "@/features/products/lib/product-card-variant";

type ProductCardThemeContextValue = ProductCardTheme & {
  displayOverrides: ProductCardDisplayOverrides;
  cardVariant: ProductCardVariant;
  effectiveCardDisplay: ResolvedProductCardDisplay;
};

const ProductCardThemeContext = createContext<ProductCardThemeContextValue | null>(null);

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
  const value = useMemo<ProductCardThemeContextValue>(
    () => ({
      ...theme,
      displayOverrides,
      cardVariant,
      effectiveCardDisplay: mergeProductCardDisplayOverrides(theme.cardDisplay, displayOverrides),
    }),
    [theme, displayOverrides, cardVariant],
  );

  return (
    <ProductCardThemeContext.Provider value={value}>{children}</ProductCardThemeContext.Provider>
  );
}

export function useProductCardTheme(): ProductCardThemeContextValue {
  const ctx = useContext(ProductCardThemeContext);
  if (!ctx) {
    const fallback = defaultProductCardTheme();
    return {
      ...fallback,
      displayOverrides: {},
      cardVariant: "default",
      effectiveCardDisplay: fallback.cardDisplay,
    };
  }
  return ctx;
}

export function useProductCardDisplayOverrides(): ProductCardDisplayOverrides {
  return useProductCardTheme().displayOverrides;
}
