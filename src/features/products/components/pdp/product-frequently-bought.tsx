import { ProductListingCard } from "@/features/products/components/listing/product-listing-card";
import type { Product } from "@/features/products/types";
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
};

export async function ProductFrequentlyBought({ locale, slug, product, title }: Props) {
  const items = (product.bought_together ?? []) as BoughtTogetherItem[];
  if (items.length === 0) {
    return <ProductRelatedSection locale={locale} slug={slug} product={product} title={title} />;
  }

  const cards = await queryListingRecordsByIdentifiers(locale, items);

  if (cards.length === 0) {
    return <ProductRelatedSection locale={locale} slug={slug} product={product} title={title} />;
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
              />
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
