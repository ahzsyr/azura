import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import type { Locale } from "@/i18n/routing";
import { FALLBACK_LOCALES } from "@/i18n/locale-config";
import { getDirectionByPrefix, getEnabledUrlPrefixes } from "@/i18n/locale-registry.server";
import { seoService } from "@/features/seo/seo.service";
import { CatalogListingPageShell } from "@/features/catalog/components/catalog-listing-page-shell";
import { loadCatalogListingTheme } from "@/features/catalog/lib/load-catalog-theme";
import { buildProductListingCatalog } from "@/features/products/listing/catalog";
import { ProductListingIsland } from "@/features/products/components/product-listing-island";
import { loadListingLabels } from "@/features/products/listing/load-listing-labels";
import { aggregateFacets } from "@/features/products/listing/aggregate-facets";
import { collectionsDataService } from "@/features/collections/collections-data.service";
import { orderCollectionsHierarchy } from "@/features/collections/collection-hierarchy";
import {
  findBrandBySlug,
  loadBrandAndTagEntries,
} from "@/features/catalog/brand-tag-pages.service";
import { getLocalizedField } from "@/lib/utils";

export const revalidate = 60;

const FALLBACK_PREFIXES = FALLBACK_LOCALES.map((locale) => locale.urlPrefix);

type Props = {
  params: Promise<{ locale: string; slug: string }>;
};

export async function generateStaticParams() {
  let locales: string[] = [];
  try {
    locales = await getEnabledUrlPrefixes();
  } catch {
    locales = [...FALLBACK_PREFIXES];
  }
  if (locales.length === 0) locales = [...FALLBACK_PREFIXES];

  const localizedSlugs = await Promise.all(
    locales.map(async (locale) => {
      const listing = await buildProductListingCatalog(locale);
      const { brands } = await loadBrandAndTagEntries(locale, listing.records);
      return { locale, slugs: brands.map((brand) => brand.slug) };
    }),
  );
  return localizedSlugs.flatMap(({ locale, slugs }) => slugs.map((slug) => ({ locale, slug })));
}

export async function generateMetadata({ params }: Props) {
  const { locale, slug } = await params;
  const listing = await buildProductListingCatalog(locale);
  const { brands } = await loadBrandAndTagEntries(locale, listing.records);
  const brand = findBrandBySlug(brands, slug);
  const title = brand ? `${brand.name} Products` : "Brand";
  const description = brand
    ? `Browse ${brand.name} products and related catalog items.`
    : "Browse brand products.";

  try {
    return await seoService.resolveMetadata({
      locale: locale as Locale,
      path: `/brands/${slug}`,
      pageKey: `brand:${slug}`,
      fallback: { title, description },
    });
  } catch {
    return { title, description };
  }
}

export default async function BrandDetailPage({ params }: Props) {
  const { locale, slug } = await params;
  setRequestLocale(locale);

  const [theme, listingCopy, pageDir, allCols, listing] = await Promise.all([
    loadCatalogListingTheme(locale, "products"),
    loadListingLabels("product", locale),
    getDirectionByPrefix(locale),
    collectionsDataService.loadAll({ localePrefix: locale }),
    buildProductListingCatalog(locale),
  ]);

  const { brands } = await loadBrandAndTagEntries(locale, listing.records);
  const brand = findBrandBySlug(brands, slug);
  if (!brand) notFound();

  const collections = orderCollectionsHierarchy(allCols.filter((c) => c.visible !== false));
  const records = listing.records.filter(
    (record) => (record.brand ?? "").trim().toLowerCase() === brand.name.toLowerCase(),
  );
  const facets = aggregateFacets(records, collections);

  return (
    <CatalogListingPageShell
      title={brand.name}
      hero={theme.hero}
      headingTextEffect={theme.headingTextEffect}
      dir={pageDir}
      brandDetail={{
        logoUrl: brand.profile?.logoUrl,
        description: brand.profile
          ? getLocalizedField(brand.profile as Record<string, unknown>, "description", locale)
          : "",
        productCount: brand.productCount,
        collectionCount: facets.collections.length,
      }}
    >
      <ProductListingIsland
        locale={locale}
        records={records}
        facets={facets}
        collections={collections}
        layoutVariant="catalog"
        listingMode="product"
        hierarchyLabels={listingCopy.hierarchyLabels}
        hierarchyVariant={theme.listingLayout.chromeVariant}
        searchDebounceMs={theme.searchDebounceMs}
        searchFuzziness={theme.searchFuzziness}
        defaultViewMode={theme.listingLayout.defaultViewMode}
        viewModes={theme.listingLayout.viewModes}
        labels={listingCopy.labels}
        catalogToolbarLabels={listingCopy.catalogToolbarLabels}
        cardTheme={theme}
        catalogToolbarDock={theme.toolbarDock}
        pageDir={pageDir}
        total={records.length}
        totalPages={1}
      />
    </CatalogListingPageShell>
  );
}
