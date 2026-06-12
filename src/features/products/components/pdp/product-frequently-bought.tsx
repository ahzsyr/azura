import { ProductListingCard } from "@/features/products/components/listing/product-listing-card";
import { ProductCardThemeSection } from "@/features/products/components/listing/product-card-theme-section";
import type { Product } from "@/features/products/types";
import type { ProductCardTheme } from "@/features/products/lib/product-card-theme";
import { defaultProductCardTheme } from "@/features/products/lib/product-card-theme";
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
  cardTheme?: ProductCardTheme;
};

export async function ProductFrequentlyBought({
  locale,
  slug,
  product,
  title,
  cardTheme = defaultProductCardTheme(),
}: Props) {
  const relatedProps = {
    locale,
    slug,
    product,
    title,
    cardTheme,
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
    <ProductCardThemeSection theme={cardTheme}>
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
                />
              </article>
            ))}
          </div>
        </div>
      </section>
    </ProductCardThemeSection>
  );
}
