import "server-only";

import { readSiteSettings } from "@/features/catalog/site-settings.service";
import { urlPrefixToCatalogLocale } from "@/features/catalog/locales";
import {
  buildProductCardThemeFromSite,
  defaultProductCardTheme,
  type ProductCardTheme,
} from "@/features/products/lib/product-card-theme";

export type { ProductCardTheme } from "@/features/products/lib/product-card-theme";
export { defaultProductCardTheme, buildProductCardThemeFromSite };

export async function loadProductCardTheme(localePrefix: string): Promise<ProductCardTheme> {
  try {
    const catalogLocale = urlPrefixToCatalogLocale(localePrefix);
    const site = await readSiteSettings(catalogLocale);
    return buildProductCardThemeFromSite(site as Record<string, unknown>);
  } catch {
    return defaultProductCardTheme();
  }
}
