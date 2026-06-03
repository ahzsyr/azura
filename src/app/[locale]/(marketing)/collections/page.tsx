import { setRequestLocale } from "next-intl/server";
import { Suspense } from "react";
import type { Locale } from "@/i18n/routing";
import { seoService } from "@/features/seo/seo.service";
import { CatalogListingPageShell } from "@/features/catalog/components/catalog-listing-page-shell";
import { loadCatalogListingTheme } from "@/features/catalog/lib/load-catalog-theme";
import { collectionsDataService } from "@/features/collections/collections-data.service";
import { orderCollectionsHierarchy } from "@/features/collections/collection-hierarchy";
import { buildCollectionListingCatalog } from "@/features/products/listing/catalog";
import { loadListingLabels } from "@/features/products/listing/load-listing-labels";
import { ProductListingIsland } from "@/features/products/components/product-listing-island";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props) {
  const { locale } = await params;
  return seoService.resolveMetadata({
    locale: locale as Locale,
    path: "collections",
    pageKey: "collections",
    fallback: {
      title: "Collections",
      description: "Browse collections.",
    },
  });
}

export default async function CollectionsIndexPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const [theme, { records, facets }, allCols, listingCopy] = await Promise.all([
    loadCatalogListingTheme(locale, "collections"),
    buildCollectionListingCatalog(locale),
    collectionsDataService.loadAll({ localePrefix: locale }),
    loadListingLabels("collection", locale),
  ]);
  const collections = orderCollectionsHierarchy(allCols.filter((c) => c.visible !== false));
  const pageDir = locale.startsWith("ar") ? "rtl" : "ltr";

  return (
    <CatalogListingPageShell
      title="Collections"
      subtitle="Browse by brand, category, or curated group."
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
          catalogToolbarDock={theme.toolbarDock}
          pageDir={pageDir}
        />
      </Suspense>
    </CatalogListingPageShell>
  );
}
