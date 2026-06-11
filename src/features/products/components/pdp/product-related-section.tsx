import type { CSSProperties } from "react";
import { ProductListingCard } from "@/features/products/components/listing/product-listing-card";
import type { Product } from "@/features/products/types";
import type { ResolvedProductBuyNow } from "@/features/products/lib/product-buy-now";
import type { ResolvedProductCtaConfig } from "@/features/products/lib/product-cta";
import type { ResolvedProductPageDisplay } from "@/features/products/lib/product-page-display";
import type { ResolvedProductCardLayout } from "@/features/products/lib/product-storefront-layout";
import { catalogProductToCollectionProduct } from "@/features/collections/engine";
import { getDeepestMatchingCollectionSlug } from "@/features/products/product-collections";
import { collectionsDataService } from "@/features/collections/collections-data.service";
import { queryRelatedListingRecords } from "@/features/products/listing/query-listing";
import { loadListingRecords } from "@/features/products/index/product-index-loader";

type Props = {
  locale: string;
  slug: string;
  product: Product;
  title?: string;
  limit?: number;
  pageDisplay?: ResolvedProductPageDisplay;
  cardLayout?: ResolvedProductCardLayout;
  cardLayoutCssVars?: Record<string, string>;
  buyNow?: ResolvedProductBuyNow;
  quoteCta?: ResolvedProductCtaConfig;
};

export async function ProductRelatedSection({
  locale,
  slug,
  product,
  title = "You May Also Like",
  limit = 4,
  pageDisplay,
  cardLayout,
  cardLayoutCssVars,
  buyNow,
  quoteCta,
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

  return (
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
            numberLocale={locale.startsWith("ar") ? "ar-AE" : "en-US"}
            localePrefix={locale}
            pageDisplay={pageDisplay}
            cardLayout={cardLayout}
            cardStyle={cardLayoutCssVars as CSSProperties | undefined}
            buyNow={buyNow}
            quoteCta={quoteCta}
          />
        ))}
      </div>
    </section>
  );
}
