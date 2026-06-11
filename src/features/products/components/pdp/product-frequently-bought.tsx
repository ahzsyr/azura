import type { CSSProperties } from "react";
import { ProductListingCard } from "@/features/products/components/listing/product-listing-card";
import type { Product } from "@/features/products/types";
import type { ResolvedProductBuyNow } from "@/features/products/lib/product-buy-now";
import type { ResolvedProductCtaConfig } from "@/features/products/lib/product-cta";
import type { ResolvedProductPageDisplay } from "@/features/products/lib/product-page-display";
import type { ResolvedProductCardLayout } from "@/features/products/lib/product-storefront-layout";
import { ProductRelatedSection } from "./product-related-section";
import { queryListingRecordsByIdentifiers } from "@/features/products/listing/query-listing";

type BoughtTogetherItem = {
  slug?: string;
  url?: string;
  mpn?: string;
  name?: string;
};

type Props = {
  locale: string;
  slug: string;
  product: Product;
  title: string;
  pageDisplay: ResolvedProductPageDisplay;
  cardLayout?: ResolvedProductCardLayout;
  cardLayoutCssVars?: Record<string, string>;
  buyNow?: ResolvedProductBuyNow;
  quoteCta?: ResolvedProductCtaConfig;
};

export async function ProductFrequentlyBought({
  locale,
  slug,
  product,
  title,
  pageDisplay,
  cardLayout,
  cardLayoutCssVars,
  buyNow,
  quoteCta,
}: Props) {
  const relatedProps = {
    locale,
    slug,
    product,
    title,
    pageDisplay,
    cardLayout,
    cardLayoutCssVars,
    buyNow,
    quoteCta,
  };

  const items = (product.bought_together ?? []) as BoughtTogetherItem[];
  if (items.length === 0) {
    return <ProductRelatedSection {...relatedProps} />;
  }

  const cards = await queryListingRecordsByIdentifiers(locale, items);

  if (cards.length === 0) {
    return <ProductRelatedSection {...relatedProps} />;
  }

  return (
    <section className="prd-fbt" data-product-fbt>
      <h2>{title}</h2>
      <div className="prd-fbt__carousel" tabIndex={0} aria-label={title}>
        <div className="prd-fbt__track">
          {cards.map((item) => (
            <article key={item.slug} className="prd-fbt__slide">
              <ProductListingCard
                product={item}
                href={`/${locale}/products/${item.slug}`}
                numberLocale={locale.startsWith("ar") ? "ar-AE" : "en-US"}
                localePrefix={locale}
                pageDisplay={pageDisplay}
                cardLayout={cardLayout}
                cardStyle={cardLayoutCssVars as CSSProperties | undefined}
                buyNow={buyNow}
                quoteCta={quoteCta}
              />
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
