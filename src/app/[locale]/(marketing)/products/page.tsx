import { setRequestLocale } from "next-intl/server";
import { Suspense } from "react";
import type { Locale } from "@/i18n/routing";
import { RouteSuspenseFallback } from "@/components/layout/route-suspense-fallback";
import { seoService } from "@/features/seo/seo.service";
import { CmsPageBlocksSection } from "@/features/cms/components/cms-page-blocks-section";
import { CatalogListingPageShell } from "@/features/catalog/components/catalog-listing-page-shell";
import { loadCatalogListingTheme } from "@/features/catalog/lib/load-catalog-theme";
import { buildProductListingCatalog } from "@/features/products/listing/catalog";
import { collectionsDataService } from "@/features/collections/collections-data.service";
import { orderCollectionsHierarchy } from "@/features/collections/collection-hierarchy";
import { loadListingLabels } from "@/features/products/listing/load-listing-labels";
import { ProductListingIsland } from "@/features/products/components/product-listing-island";
import { filterStateFromSearchParams } from "@/features/products/listing/url-state";
import { agentLog, agentLogError } from "@/lib/debug/agent-log";

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
  agentLog({
    location: "products/page.tsx:generateMetadata",
    message: "start",
    hypothesisId: "H6",
    data: { locale },
  });
  try {
    const meta = await seoService.resolveMetadata({
      locale: locale as Locale,
      path: "products",
      pageKey: "products",
      fallback: { title: "Products", description: "Browse our product catalog." },
    });
    agentLog({
      location: "products/page.tsx:generateMetadata",
      message: "success",
      hypothesisId: "H6",
      data: { locale },
    });
    return meta;
  } catch (error) {
    agentLogError("products/page.tsx:generateMetadata", error, "H6", { locale });
    return { title: "Products", description: "Browse our product catalog." };
  }
}

export default async function ProductsIndexPage({ params, searchParams }: Props) {
  const { locale } = await params;
  const filterState = filterStateFromSearchParams(toUrlSearchParams(await searchParams));
  setRequestLocale(locale);
  agentLog({
    location: "products/page.tsx:ProductsIndexPage",
    message: "start",
    hypothesisId: "H7",
    data: { locale, page: filterState.page, per: filterState.per },
  });

  try {
  const [theme, catalog, allCols, listingCopy] = await Promise.all([
    loadCatalogListingTheme(locale, "products"),
    buildProductListingCatalog(locale, filterState),
    collectionsDataService.loadAll({ localePrefix: locale }),
    loadListingLabels("product", locale),
  ]);
  agentLog({
    location: "products/page.tsx:ProductsIndexPage",
    message: "data loaded",
    hypothesisId: "H7",
    data: {
      locale,
      recordCount: catalog.records.length,
      total: catalog.total ?? catalog.records.length,
      collectionCount: allCols.length,
    },
  });
  const { records, facets, total = records.length, totalPages = 1 } = catalog;
  const collections = orderCollectionsHierarchy(allCols.filter((c) => c.visible !== false));
  const pageDir = locale.startsWith("ar") ? "rtl" : "ltr";

  agentLog({
    location: "products/page.tsx:ProductsIndexPage",
    message: "render complete",
    hypothesisId: "H7",
    data: { locale, recordCount: records.length },
  });

  return (
    <CatalogListingPageShell
      title=""
      subtitle=""
      eyebrow=""
      hero={theme.hero}
      headingTextEffect={theme.headingTextEffect}
      blocks={<CmsPageBlocksSection slug="products" locale={locale as Locale} />}
    >
      <Suspense fallback={<RouteSuspenseFallback variant="grid" />}>
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
          buyNow={theme.buyNow}
          quoteCta={theme.quoteCta}
          cardLayout={theme.cardLayout}
          pageDisplay={theme.pageDisplay}
          catalogToolbarDock={theme.toolbarDock}
          pageDir={pageDir}
          serverPaginated
          total={total}
          totalPages={totalPages}
        />
      </Suspense>
    </CatalogListingPageShell>
  );
  } catch (error) {
    agentLogError("products/page.tsx:ProductsIndexPage", error, "H7", { locale });
    throw error;
  }
}
