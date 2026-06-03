import { setRequestLocale } from "next-intl/server";
import { Suspense } from "react";
import type { Locale } from "@/i18n/routing";
import { seoService } from "@/features/seo/seo.service";
import { collectionsDataService } from "@/features/collections/collections-data.service";
import { orderCollectionsHierarchy } from "@/features/collections/collection-hierarchy";
import {
  buildCollectionTrail,
  collectionMapFromList,
  getChildCollections,
} from "@/features/collections/collection-navigation";
import {
  CollectionDetailHero,
  CollectionSubcollectionsGrid,
} from "@/features/collections/components/collection-detail-hero";
import { loadCatalogListingTheme } from "@/features/catalog/lib/load-catalog-theme";
import { buildProductListingCatalogForCollection } from "@/features/products/listing/catalog";
import { ProductListingIsland } from "@/features/products/components/product-listing-island";
import { loadListingLabels } from "@/features/products/listing/load-listing-labels";
import { filterStateFromSearchParams } from "@/features/products/listing/url-state";
import { notFound } from "next/navigation";
import Link from "next/link";

type Props = {
  params: Promise<{ locale: string; slug: string }>;
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
  const { locale, slug } = await params;
  const collection = await collectionsDataService.loadBySlug({ localePrefix: locale }, slug);
  const title = collection?.seo?.metaTitle || collection?.name || "Collection";
  const description =
    collection?.seo?.metaDescription || collection?.description || "Browse collection products.";

  return seoService.resolveMetadata({
    locale: locale as Locale,
    path: `collections/${slug}`,
    pageKey: `collection:${slug}`,
    fallback: { title, description },
  });
}

export default async function CollectionDetailPage({ params, searchParams }: Props) {
  const { locale, slug } = await params;
  const filterState = filterStateFromSearchParams(toUrlSearchParams(await searchParams));
  setRequestLocale(locale);

  const collection = await collectionsDataService.loadBySlug({ localePrefix: locale }, slug);
  if (!collection) notFound();

  const [theme, catalog, allCols, listingCopy] = await Promise.all([
    loadCatalogListingTheme(locale, "collections"),
    buildProductListingCatalogForCollection(locale, slug, filterState),
    collectionsDataService.loadAll({ localePrefix: locale }),
    loadListingLabels("product", locale),
  ]);
  const { records, facets, total = records.length, totalPages = 1 } = catalog;
  const pageDir = locale.startsWith("ar") ? "rtl" : "ltr";
  const collections = orderCollectionsHierarchy(allCols.filter((c) => c.visible !== false));
  const bySlug = collectionMapFromList(collections);
  const trail = buildCollectionTrail(locale, slug, bySlug);
  const subcollections = getChildCollections(slug, collections);

  return (
    <div className="col-detail-wrap">
      <nav className="text-xs text-muted-foreground mb-4 flex flex-wrap gap-1">
        <Link href={`/${locale}/collections`} className="hover:underline">
          Collections
        </Link>
        {trail.map((item) => (
          <span key={item.href} className="flex items-center gap-1">
            <span>/</span>
            {item.href.endsWith(`/${slug}`) ? (
              <span className="text-foreground">{item.name}</span>
            ) : (
              <Link href={item.href} className="hover:underline">
                {item.name}
              </Link>
            )}
          </span>
        ))}
      </nav>

      <CollectionDetailHero
        collection={collection}
        allCollections={collections}
        locale={locale}
        productCount={total}
        subcollectionCount={subcollections.length}
      />

      <CollectionSubcollectionsGrid
        subcollections={subcollections}
        allCollections={collections}
        locale={locale}
      />

      <section className="col-products" aria-label="Products">
        <Suspense fallback={<p className="text-sm text-muted-foreground">Loading products…</p>}>
          <ProductListingIsland
            locale={locale}
            records={records}
            facets={facets}
            collections={collections}
            collectionScope={slug}
            layoutVariant="collections-catalog"
            listingMode="product"
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
      </section>
    </div>
  );
}
