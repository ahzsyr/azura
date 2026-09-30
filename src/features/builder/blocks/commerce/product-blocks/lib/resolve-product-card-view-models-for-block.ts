import "server-only";

import type { ProductCardViewModel } from "@/view-models/product-card";
import { resolveViewModelsForSelection } from "@/resolvers/resolve-view-model";
import { loadProductCardTheme } from "@/features/products/lib/load-product-card-theme";
import type { ProductSelectionConfig } from "@/features/builder/blocks/commerce/product-blocks/schemas/product-blocks";
import type { ProductCardDisplayOverrides } from "@/features/products/lib/product-card-display";
import type { ActiveTemplateId } from "@/view-models/types";

export async function resolveProductCardViewModelsForBlock(
  localePrefix: string,
  config: ProductSelectionConfig,
  options?: {
    templateId?: ActiveTemplateId;
    displayOverrides?: ProductCardDisplayOverrides;
  },
): Promise<ProductCardViewModel[]> {
  const templateId = options?.templateId ?? "product-card";
  const cardTheme = await loadProductCardTheme(localePrefix);

  return resolveViewModelsForSelection("product", templateId, config, {
    locale: localePrefix,
    localePrefix,
    cardTheme,
  }, {
    productCard: { displayOverrides: options?.displayOverrides },
  }) as Promise<ProductCardViewModel[]>;
}
