import { setRequestLocale } from "next-intl/server";
import { Suspense } from "react";
import type { Locale } from "@/i18n/routing";
import { seoService } from "@/features/seo/seo.service";
import { CatalogListingPageShell } from "@/features/catalog/components/catalog-listing-page-shell";
import { loadCatalogListingTheme } from "@/features/catalog/lib/load-catalog-theme";
import { buildProductListingCatalog } from "@/features/products/listing/catalog";
import { collectionsDataService } from "@/features/collections/collections-data.service";
import { orderCollectionsHierarchy } from "@/features/collections/collection-hierarchy";
import { loadListingLabels } from "@/features/products/listing/load-listing-labels";
import { ProductListingIsland } from "@/features/products/components/product-listing-island";
import { filterStateFromSearchParams } from "@/features/products/listing/url-state";

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function toUrlSearchParams(
  raw: Record<string, string | string[] | undefined>,
): URLSearchParams {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(raw)) {
    if (value == null) continue;
    if (Array.isArray(value)) {
      for (const item of value) params.append(key, item);
    } else {
      params.set(key, value);
    }
  }
  return params;
}

export async function generateMetadata({ params }: Props) {
  const { locale } = await params;
  return seoService.resolveMetadata({
    locale: locale as Locale,
    path: "products",
    pageKey: "products",
    fallback: { title: "Products", description: "Browse products." },
  });
}

export default async function ProductsIndexPage({ params, searchParams }: Props) {
  const { locale } = await params;
  const filterState = filterStateFromSearchParams(toUrlSearchParams(await searchParams));
  setRequestLocale(locale);

  const [theme, catalog, allCols, listingCopy] = await Promise.all([
    loadCatalogListingTheme(locale, "products"),
    buildProductListingCatalog(locale, filterState),
    collectionsDataService.loadAll({ localePrefix: locale }),
    loadListingLabels("product", locale),
  ]);
  const { records, facets, total = records.length, totalPages = 1 } = catalog;
  const collections = orderCollectionsHierarchy(allCols.filter((c) => c.visible !== false));
  const pageDir = locale.startsWith("ar") ? "rtl" : "ltr";

  return (
    <CatalogListingPageShell
      title="Products"
      subtitle={`${total} item${total !== 1 ? "s" : ""} in catalog`}
      eyebrow="Catalog"
      hero={theme.hero}
      headingTextEffect={theme.headingTextEffect}
    >
      <Suspense fallback={<p className="text-sm text-muted-foreground px-4">Loading catalog…</p>}>
        <ProductListingIsland
          locale={locale}
          records={records}
          facets={facets}
          collections={collections}
          layoutVariant="catalog"
          listingMode="product"
          hierarchyVariant={theme.listingLayout.chromeVariant}
          searchDebounceMs={theme.searchDebounceMs}
          searchFuzziness={theme.searchFuzziness}
          defaultViewMode={theme.listingLayout.defaultViewMode}
          viewModes={theme.listingLayout.viewModes}
          labels={listingCopy.labels}
          catalogToolbarLabels={listingCopy.catalogToolbarLabels}
          cardLayoutCssVars={theme.cardLayoutCssVars}
          catalogToolbarDock={theme.toolbarDock}
          pageDir={pageDir}
          serverPaginated
          total={total}
          totalPages={totalPages}
        />
      </Suspense>
    </CatalogListingPageShell>
  );
}
