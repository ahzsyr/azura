import Link from "next/link";
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
import { findTagBySlug, loadBrandAndTagEntries } from "@/features/catalog/brand-tag-pages.service";

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
      const { tags } = await loadBrandAndTagEntries(locale, listing.records);
      return { locale, slugs: tags.map((tag) => tag.slug) };
    }),
  );
  return localizedSlugs.flatMap(({ locale, slugs }) => slugs.map((slug) => ({ locale, slug })));
}

export async function generateMetadata({ params }: Props) {
  const { locale, slug } = await params;
  const listing = await buildProductListingCatalog(locale);
  const { tags } = await loadBrandAndTagEntries(locale, listing.records);
  const tag = findTagBySlug(tags, slug);
  const title = tag ? `${tag.name} Products` : "Tag";
  const description = tag
    ? `Browse products tagged with ${tag.name}.`
    : "Browse tagged products.";

  try {
    return await seoService.resolveMetadata({
      locale: locale as Locale,
      path: `/tags/${slug}`,
      pageKey: `tag:${slug}`,
      fallback: { title, description },
    });
  } catch {
    return { title, description };
  }
}

export default async function TagDetailPage({ params }: Props) {
  const { locale, slug } = await params;
  setRequestLocale(locale);

  const [theme, listingCopy, pageDir, allCols, listing] = await Promise.all([
    loadCatalogListingTheme(locale, "products"),
    loadListingLabels("product", locale),
    getDirectionByPrefix(locale),
    collectionsDataService.loadAll({ localePrefix: locale }),
    buildProductListingCatalog(locale),
  ]);

  const { tags } = await loadBrandAndTagEntries(locale, listing.records);
  const tag = findTagBySlug(tags, slug);
  if (!tag) notFound();

  const collections = orderCollectionsHierarchy(allCols.filter((c) => c.visible !== false));
  const records = listing.records.filter((record) =>
    record.tags.some((item) => item.trim().toLowerCase() === tag.name.toLowerCase()),
  );
  const facets = aggregateFacets(records, collections);

  return (
    <CatalogListingPageShell
      title={tag.name}
      subtitle={`${tag.productCount} product${tag.productCount === 1 ? "" : "s"} with this tag`}
      hero={theme.hero}
      headingTextEffect={theme.headingTextEffect}
      dir={pageDir}
    >
      <section className="section-padding container-premium space-y-6">
        <nav className="flex items-center gap-2 text-xs text-muted-foreground">
          <Link href={`/${locale}/tags`} className="hover:underline">
            Tags
          </Link>
          <span>/</span>
          <span className="text-foreground">{tag.name}</span>
        </nav>
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
      </section>
    </CatalogListingPageShell>
  );
}
