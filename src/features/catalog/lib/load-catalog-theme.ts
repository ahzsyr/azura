import "server-only";

import {
  catalogToolbarDockCssVars,
  normalizeCatalogPageHeroPartial,
  normalizeCatalogToolbarDockPartial,
  normalizeProductListingLayoutPartial,
  resolveCatalogPageHero,
  resolveCatalogToolbarDock,
  resolveProductListingLayout,
  type ResolvedCatalogPageHero,
  type ResolvedCatalogToolbarDock,
  type ResolvedProductListingLayout,
} from "@/features/catalog/lib/catalog-layout";
import { loadPageListingLayout } from "@/features/catalog/lib/catalog-page-config";
import { readSiteSettings } from "@/features/catalog/site-settings.service";
import { themeService } from "@/features/theme/theme.service";
import { resolveVisualExperience } from "@/features/theme/visual-experience-resolver";
import { urlPrefixToCatalogLocale } from "@/features/catalog/locales";
import {
  productCardLayoutCssVars,
  resolveProductCardLayout,
  type ResolvedProductCardLayout,
} from "@/features/products/lib/product-storefront-layout";
import { resolveProductBuyNow } from "@/features/products/lib/product-buy-now";
import { normalizeProductCtaGlobal, resolveProductCta } from "@/features/products/lib/product-cta";
import { migrateProductCtaFromLegacyAddToCart } from "@/features/products/lib/product-cta-migrate";
import { mergeProductCta } from "@/features/products/lib/product-cta";
import type { ResolvedProductBuyNow } from "@/features/products/lib/product-buy-now";
import type { ResolvedProductCtaConfig } from "@/features/products/lib/product-cta";

export type CatalogListingTheme = {
  hero: ResolvedCatalogPageHero;
  headingTextEffect: string | null;
  listingLayout: ResolvedProductListingLayout;
  toolbarDock: ResolvedCatalogToolbarDock;
  toolbarDockCssVars: Record<string, string>;
  cardLayoutCssVars: Record<string, string>;
  cardLayout: ResolvedProductCardLayout;
  buyNow: ResolvedProductBuyNow;
  quoteCta: ResolvedProductCtaConfig;
  searchDebounceMs: number;
  searchFuzziness: number;
};

export async function loadCatalogListingTheme(
  localePrefix: string,
  pageSlug: "products" | "collections",
): Promise<CatalogListingTheme> {
  const catalogLocale = urlPrefixToCatalogLocale(localePrefix);
  const [site, themeTokens] = await Promise.all([
    readSiteSettings(catalogLocale),
    themeService.getPublished(),
  ]);

  const hero = resolveCatalogPageHero(normalizeCatalogPageHeroPartial(site.catalogPageHero));
  const headingTextEffect = themeTokens
    ? resolveVisualExperience({ site: themeTokens }).textEffect
    : null;
  const listingLayout = await loadPageListingLayout(localePrefix, pageSlug);
  const toolbarDock = resolveCatalogToolbarDock(
    normalizeCatalogToolbarDockPartial(site.catalogToolbarDock),
  );
  const cardLayout = resolveProductCardLayout(
    site.productCardLayout as Parameters<typeof resolveProductCardLayout>[0],
  );
  const buyNow = resolveProductBuyNow(
    site.productBuyNow as Parameters<typeof resolveProductBuyNow>[0],
    site.productPageAddToCart as Parameters<typeof resolveProductBuyNow>[1],
  );
  const migratedCta = migrateProductCtaFromLegacyAddToCart(
    site.productCta,
    site.productPageAddToCart,
  );
  const globalCta = migratedCta
    ? mergeProductCta(normalizeProductCtaGlobal(site.productCta), migratedCta)
    : normalizeProductCtaGlobal(site.productCta);
  const quoteCta = resolveProductCta(globalCta, undefined);

  const search = (site.search ?? {}) as Record<string, unknown>;
  const searchDebounceMs =
    typeof search.debounceMs === "number" && Number.isFinite(search.debounceMs)
      ? search.debounceMs
      : 300;
  const searchFuzziness =
    typeof search.fuzziness === "number" && Number.isFinite(search.fuzziness)
      ? search.fuzziness
      : 0.35;

  return {
    hero,
    headingTextEffect,
    listingLayout,
    toolbarDock,
    toolbarDockCssVars: catalogToolbarDockCssVars(toolbarDock),
    cardLayoutCssVars: productCardLayoutCssVars(cardLayout),
    cardLayout,
    buyNow,
    quoteCta,
    searchDebounceMs,
    searchFuzziness,
  };
}
