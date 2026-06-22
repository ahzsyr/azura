"use client";

import type { ReactNode } from "react";
import type { ProductCardTheme } from "@/features/products/lib/product-card-theme";
import { ProductCardThemeProvider } from "@/features/products/components/listing/product-card-theme-context";
import type { ProductCardDisplayOverrides } from "@/features/products/lib/product-card-display";
import type { ProductCardVariant } from "@/features/products/lib/product-card-variant";

type Props = {
  theme: ProductCardTheme;
  displayOverrides?: ProductCardDisplayOverrides;
  cardVariant?: ProductCardVariant;
  children: ReactNode;
};

export function ProductCardThemeSection({
  theme,
  displayOverrides,
  cardVariant,
  children,
}: Props) {
  return (
    <ProductCardThemeProvider
      theme={theme}
      displayOverrides={displayOverrides}
      cardVariant={cardVariant}
    >
      {children}
    </ProductCardThemeProvider>
  );
}
