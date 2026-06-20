import { ProductListingCard } from "@/features/products/components/listing/product-listing-card";
import { ProductCardThemeSection } from "@/features/products/components/listing/product-card-theme-section";
import type { Product } from "@/features/products/types";
import type { ProductCardTheme } from "@/features/products/lib/product-card-theme";
import { defaultProductCardTheme } from "@/features/products/lib/product-card-theme";
import { catalogProductToCollectionProduct } from "@/features/collections/engine";
import { getDeepestMatchingCollectionSlug } from "@/features/products/product-collections";
import { collectionsDataService } from "@/features/collections/collections-data.service";
import { queryRelatedListingRecords } from "@/features/products/listing/query-listing";
import { loadListingRecords } from "@/features/products/index/product-index-loader";
import { getNumberLocale } from "@/shared/layout/direction/direction-utils";

type Props = {
  locale: string;
  slug: string;
  product: Product;
  title?: string;
  limit?: number;
  cardTheme?: ProductCardTheme;
};

export async function ProductRelatedSection({
  locale,
  slug,
  product,
  title = "You May Also Like",
  limit = 4,
  cardTheme = defaultProductCardTheme(),
}: Props) {
  const allCols = await collectionsDataService.loadAll({ localePrefix: locale });
  const engine = catalogProductToCollectionProduct(slug, product);
  const colSlug = getDeepestMatchingCollectionSlug(engine, allCols);

  const listingRecords = await loadListingRecords(locale);
  const current = listingRecords.find((r) => r.slug === slug);
  const productColSlugs =
    current?.collectionSlugs ?? (colSlug ? [colSlug] : []);

  const related = await queryRelatedListingRecords(locale, {
    excludeSlug: slug,
    collectionSlugs: productColSlugs,
    brand: product.brand,
    limit,
  });

  if (related.length === 0) return null;
  const numberLocale = getNumberLocale(locale);

  return (
    <ProductCardThemeSection theme={cardTheme}>
      <section className="prd-related mt-10" aria-labelledby="prd-related-heading">
        <h2 id="prd-related-heading" className="text-lg font-semibold mb-4">
          {title}
        </h2>
        <div className="pl-grid prd-related__grid">
          {related.map((r) => (
            <ProductListingCard
              key={r.slug}
              product={r}
              href={`/${locale}/products/${r.slug}`}
              numberLocale={numberLocale}
              localePrefix={locale}
            />
          ))}
        </div>
      </section>
    </ProductCardThemeSection>
  );
}
