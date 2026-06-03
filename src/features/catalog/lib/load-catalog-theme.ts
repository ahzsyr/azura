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
} from "@/features/products/lib/product-storefront-layout";

export type CatalogListingTheme = {
  hero: ResolvedCatalogPageHero;
  headingTextEffect: string | null;
  listingLayout: ResolvedProductListingLayout;
  toolbarDock: ResolvedCatalogToolbarDock;
  toolbarDockCssVars: Record<string, string>;
  cardLayoutCssVars: Record<string, string>;
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
    searchDebounceMs,
    searchFuzziness,
  };
}
