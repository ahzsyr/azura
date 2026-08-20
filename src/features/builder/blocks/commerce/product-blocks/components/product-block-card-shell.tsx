import type { ReactNode } from "react";
import { loadProductCardTheme } from "@/features/products/lib/load-product-card-theme";
import { ProductCardThemeSection } from "@/features/products/components/listing/product-card-theme-section";
import type { ProductCardDisplayOverrides } from "@/features/products/lib/product-card-display";
import type { ProductCardVariant } from "@/features/products/lib/product-card-variant";

type Props = {
  locale: string;
  displayOverrides?: ProductCardDisplayOverrides;
  cardVariant?: ProductCardVariant;
  children: ReactNode;
};

export async function ProductBlockCardShell({
  locale,
  displayOverrides,
  cardVariant,
  children,
}: Props) {
  const theme = await loadProductCardTheme(locale);
  return (
    <ProductCardThemeSection
      theme={theme}
      displayOverrides={displayOverrides}
      cardVariant={cardVariant}
    >
      <div className="pl-root pl-root--blocks">{children}</div>
    </ProductCardThemeSection>
  );
}
