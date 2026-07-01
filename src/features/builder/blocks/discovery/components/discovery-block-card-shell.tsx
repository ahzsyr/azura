import type { ReactNode } from "react";
import { loadProductCardTheme } from "@/features/products/lib/load-product-card-theme";
import { ProductCardThemeSection } from "@/features/products/components/listing/product-card-theme-section";
import { blockPropsToCardDisplayOverrides } from "@/features/products/lib/product-card-display";

type Props = {
  locale: string;
  displayOverrides?: ReturnType<typeof blockPropsToCardDisplayOverrides>;
  children: ReactNode;
};

export async function DiscoveryBlockCardShell({
  locale,
  displayOverrides,
  children,
}: Props) {
  const theme = await loadProductCardTheme(locale);
  return (
    <ProductCardThemeSection theme={theme} displayOverrides={displayOverrides}>
      <div className="pl-root pl-root--blocks">{children}</div>
    </ProductCardThemeSection>
  );
}
