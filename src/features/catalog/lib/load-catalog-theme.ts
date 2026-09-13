import "server-only";

import {
  catalogToolbarDockCssVars,
  normalizeCatalogPageHeroPartial,
  normalizeCatalogToolbarDockPartial,
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
import { prefixToCatalogLocaleCode } from "@/features/catalog/locales";
import {
  resolveAdminSearchSettings,
} from "@/capabilities/search/settings/resolve-admin-search-settings";
import { resolveFuzzynessForListing } from "@/capabilities/search/settings/resolve-fuzziness-for-listing";
import { buildProductCardThemeFromSite, defaultProductCardTheme, type ProductCardTheme } from "@/features/products/lib/product-card-theme";
import {
  resolveProductListingFilters,
  type ResolvedProductListingFilters,
} from "@/features/products/listing/resolve-product-listing-filters";

export type CatalogListingTheme = ProductCardTheme & {
  hero: ResolvedCatalogPageHero;
  headingTextEffect: string | null;
  listingLayout: ResolvedProductListingLayout;
  listingFilters: ResolvedProductListingFilters;
  toolbarDock: ResolvedCatalogToolbarDock;
  toolbarDockCssVars: Record<string, string>;
  searchDebounceMs: number;
  searchFuzziness: number;
};

function defaultCatalogListingTheme(
  _localePrefix: string,
  _pageSlug: "products" | "collections",
): CatalogListingTheme {
  const cardTheme = defaultProductCardTheme();
  const hero = resolveCatalogPageHero();
  const listingLayout = resolveProductListingLayout();
  const listingFilters = resolveProductListingFilters(undefined);
  const toolbarDock = resolveCatalogToolbarDock();
  return {
    ...cardTheme,
    hero,
    headingTextEffect: null,
    listingLayout,
    listingFilters,
    toolbarDock,
    toolbarDockCssVars: catalogToolbarDockCssVars(toolbarDock),
    searchDebounceMs: 150,
    searchFuzziness: 0.35,
  };
}

export async function loadCatalogListingTheme(
  localePrefix: string,
  pageSlug: "products" | "collections",
): Promise<CatalogListingTheme> {
  try {
    const catalogLocale = await prefixToCatalogLocaleCode(localePrefix);
    const [site, themeTokens] = await Promise.all([
      readSiteSettings(catalogLocale),
      themeService.getPublished(),
    ]);

    const hero = resolveCatalogPageHero(normalizeCatalogPageHeroPartial(site.catalogPageHero));
    const headingTextEffect = themeTokens
      ? resolveVisualExperience({ site: themeTokens }).textEffect
      : null;
    const listingLayout = await loadPageListingLayout(localePrefix, pageSlug);
    const listingFilters = resolveProductListingFilters(site.productListingFilters);
    const toolbarDock = resolveCatalogToolbarDock(
      normalizeCatalogToolbarDockPartial(site.catalogToolbarDock),
    );
    const cardTheme = buildProductCardThemeFromSite(site as Record<string, unknown>);

    const adminSearch = resolveAdminSearchSettings(site);
    const searchDebounceMs = adminSearch.general.debounceMs ?? 150;
    const searchFuzziness = resolveFuzzynessForListing(adminSearch);

    return {
      ...cardTheme,
      hero,
      headingTextEffect,
      listingLayout,
      listingFilters,
      toolbarDock,
      toolbarDockCssVars: catalogToolbarDockCssVars(toolbarDock),
      searchDebounceMs,
      searchFuzziness,
    };
  } catch {
    return defaultCatalogListingTheme(localePrefix, pageSlug);
  }
}
