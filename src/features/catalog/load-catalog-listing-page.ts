import "server-only";

import { loadCatalogListingTheme } from "@/features/catalog/lib/load-catalog-theme";
import { orderCollectionsHierarchy } from "@/features/collections/collection-hierarchy";
import { loadCollectionProductCounts } from "@/features/collections/collection-product-counts";
import { collectionsForPublicHierarchy } from "@/features/collections/collection-public-visibility";
import { collectionsDataService } from "@/features/collections/collections-data.service";
import type { Collection } from "@/features/collections/types";
import type { CollectionHierarchyChromeLabels } from "@/features/collections/components/collection-hierarchy-chrome";
import type { CatalogListingTheme } from "@/features/catalog/lib/load-catalog-theme";
import {
  buildCollectionListingCatalog,
  buildProductListingCatalog,
} from "@/features/products/listing/catalog";
import { loadListingLabels } from "@/features/products/listing/load-listing-labels";
import type {
  CatalogToolbarLabels,
  ProductListingLabels,
} from "@/features/products/listing/listing-labels";
import type { ListingFilterState, ProductListingCatalogPayload } from "@/features/products/listing/types";
import { filterStateFromSearchParams } from "@/features/products/listing/url-state";
import { getDirectionByPrefix } from "@/i18n/locale-registry.server";

export type CatalogPageSlug = "products" | "collections";

export type CatalogListingShellPayload = {
  theme: CatalogListingTheme;
  collections: Collection[];
  listingCopy: {
    labels: ProductListingLabels;
    catalogToolbarLabels: CatalogToolbarLabels;
    hierarchyLabels: CollectionHierarchyChromeLabels;
    pageTitle: string;
  };
  pageDir: "ltr" | "rtl";
  listingMode: "product" | "collection";
};

export type CatalogListingPagePayload = CatalogListingShellPayload & {
  listing: ProductListingCatalogPayload;
};

function defaultFilterState(): ListingFilterState {
  return filterStateFromSearchParams(new URLSearchParams());
}

export async function loadCatalogListingShell(
  locale: string,
  pageSlug: CatalogPageSlug,
): Promise<CatalogListingShellPayload> {
  const listingMode = pageSlug === "collections" ? "collection" : "product";

  const [theme, allCols, listingCopy] = await Promise.all([
    loadCatalogListingTheme(locale, pageSlug),
    collectionsDataService.loadAll({ localePrefix: locale }),
    loadListingLabels(listingMode, locale),
  ]);
  const pageDir = await getDirectionByPrefix(locale);

  const visibleCols = orderCollectionsHierarchy(allCols.filter((c) => c.visible !== false));
  const productCounts =
    pageSlug === "collections"
      ? await loadCollectionProductCounts(locale, visibleCols)
      : null;
  const collections =
    pageSlug === "collections" && productCounts
      ? collectionsForPublicHierarchy(visibleCols, productCounts)
      : visibleCols;

  return {
    theme,
    collections,
    listingCopy,
    pageDir,
    listingMode,
  };
}

export async function loadCatalogListingPayload(
  locale: string,
  pageSlug: CatalogPageSlug,
  filter?: Partial<ListingFilterState>,
  options?: {
    collections?: Collection[];
    productCounts?: Map<string, number>;
  },
): Promise<ProductListingCatalogPayload> {
  const filterState = { ...defaultFilterState(), ...filter };
  const buildOptions = {
    collections: options?.collections,
    productCounts: options?.productCounts,
  };

  if (pageSlug === "collections") {
    return buildCollectionListingCatalog(locale, filterState, buildOptions);
  }
  return buildProductListingCatalog(locale, filterState, buildOptions);
}

export async function loadCatalogListingPage(
  locale: string,
  pageSlug: CatalogPageSlug,
  filter?: Partial<ListingFilterState>,
): Promise<CatalogListingPagePayload> {
  const allCols = await collectionsDataService.loadAll({ localePrefix: locale });
  const visibleCols = orderCollectionsHierarchy(allCols.filter((c) => c.visible !== false));

  const productCounts =
    pageSlug === "collections"
      ? await loadCollectionProductCounts(locale, visibleCols)
      : undefined;
  const hierarchyCols =
    pageSlug === "collections" && productCounts
      ? collectionsForPublicHierarchy(visibleCols, productCounts)
      : visibleCols;

  const listingMode = pageSlug === "collections" ? "collection" : "product";

  const [theme, listingCopy, pageDir] = await Promise.all([
    loadCatalogListingTheme(locale, pageSlug),
    loadListingLabels(listingMode, locale),
    getDirectionByPrefix(locale),
  ]);

  const listing = await loadCatalogListingPayload(locale, pageSlug, filter, {
    collections: visibleCols,
    productCounts,
  });

  return {
    theme,
    collections: hierarchyCols,
    listingCopy,
    pageDir,
    listingMode,
    listing,
  };
}
