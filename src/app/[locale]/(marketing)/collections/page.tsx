import { setRequestLocale } from "next-intl/server";
import { Suspense } from "react";
import type { Locale } from "@/i18n/routing";
import { seoService } from "@/features/seo/seo.service";
import { CmsPageBlocksSection } from "@/features/cms/components/cms-page-blocks-section";
import { CatalogListingPageShell } from "@/features/catalog/components/catalog-listing-page-shell";
import { loadCatalogListingTheme } from "@/features/catalog/lib/load-catalog-theme";
import { collectionsDataService } from "@/features/collections/collections-data.service";
import { orderCollectionsHierarchy } from "@/features/collections/collection-hierarchy";
import { buildCollectionListingCatalog } from "@/features/products/listing/catalog";
import { loadListingLabels } from "@/features/products/listing/load-listing-labels";
import { ProductListingIsland } from "@/features/products/components/product-listing-island";
import { filterStateFromSearchParams } from "@/features/products/listing/url-state";

export const revalidate = 60;

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
    path: "collections",
    pageKey: "collections",
    fallback: {
      title: "",
      description: "",
    },
  });
}

export default async function CollectionsIndexPage({ params, searchParams }: Props) {
  const { locale } = await params;
  const filterState = filterStateFromSearchParams(toUrlSearchParams(await searchParams));
  setRequestLocale(locale);

  const [theme, catalog, allCols, listingCopy] = await Promise.all([
    loadCatalogListingTheme(locale, "collections"),
    buildCollectionListingCatalog(locale, filterState),
    collectionsDataService.loadAll({ localePrefix: locale }),
    loadListingLabels("collection", locale),
  ]);
  const { records, facets, total = records.length, totalPages = 1 } = catalog;
  const collections = orderCollectionsHierarchy(allCols.filter((c) => c.visible !== false));
  const pageDir = locale.startsWith("ar") ? "rtl" : "ltr";

  return (
    <CatalogListingPageShell
      title=""
      subtitle=""
      eyebrow=""
      hero={theme.hero}
      headingTextEffect={theme.headingTextEffect}
      blocks={<CmsPageBlocksSection slug="collections" locale={locale as Locale} />}
    >
      <Suspense fallback={<p className="text-sm text-muted-foreground px-4">Loading catalog…</p>}>
        <ProductListingIsland
          locale={locale}
          records={records}
          facets={facets}
          collections={collections}
          layoutVariant="catalog"
          listingMode="collection"
          hierarchyLabels={listingCopy.hierarchyLabels}
          hierarchyVariant={theme.listingLayout.chromeVariant}
          searchDebounceMs={theme.searchDebounceMs}
          searchFuzziness={theme.searchFuzziness}
          defaultViewMode={theme.listingLayout.defaultViewMode}
          viewModes={theme.listingLayout.viewModes}
          labels={listingCopy.labels}
          catalogToolbarLabels={listingCopy.catalogToolbarLabels}
          cardLayoutCssVars={theme.cardLayoutCssVars}
          buyNow={theme.buyNow}
          quoteCta={theme.quoteCta}
          cardLayout={theme.cardLayout}
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
