import Link from "next/link";
import type { CSSProperties } from "react";
import type { ProductListingRecord } from "@/features/products/listing/types";
import { ProductAddToCompare } from "@/features/products/components/product-add-to-compare";

type Props = {
  product: ProductListingRecord;
  href: string;
  numberLocale?: string;
  cardStyle?: CSSProperties;
  priority?: boolean;
};

function formatPrice(amount: number, currency: string, locale: string): string {
  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: currency === "JPY" ? 0 : 2,
    }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
}

export function ProductListingCard({
  product,
  href,
  numberLocale = "en-US",
  cardStyle,
  priority = false,
}: Props) {
  const sale = product.price.value;
  const compare = product.old_price;
  const discountPercent =
    compare && compare > sale ? Math.round(((compare - sale) / compare) * 100) : 0;

  return (
    <article className="pl-card" data-product-slug={product.slug} style={cardStyle}>
      <div className="pl-card__compare">
        <ProductAddToCompare productId={product.id} />
      </div>
      {discountPercent > 0 ? <span className="pl-card__discount">-{discountPercent}%</span> : null}
      <Link href={href} className="pl-card__media-link" aria-label={`${product.name} — view product`}>
        {product.primary_image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            className="pl-card__media-img"
            src={product.primary_image}
            alt={product.name}
            loading={priority ? "eager" : "lazy"}
            {...(priority ? { fetchPriority: "high" as const } : {})}
            decoding="async"
            data-priority-img={priority ? "" : undefined}
          />
        ) : (
          <span className="pl-card__placeholder">No image</span>
        )}
      </Link>
      <section className="pl-card__content">
        <Link href={href} className="pl-card__title-link">
          {product.brand ? <small className="pl-card__brand">{product.brand}</small> : null}
          {!product.in_stock ? <span className="pl-card__stock-badge">Out of stock</span> : null}
          <h3 className="pl-card__title ui-text-product-card">{product.name}</h3>
        </Link>
        {product.short_description ? <p className="pl-card__desc">{product.short_description}</p> : null}
        <footer className="pl-card__meta">
          <span className="pl-card__prices">
            {compare != null && compare > 0 ? (
              <span className="pl-card__old-price">
                {formatPrice(compare, product.price.currency, numberLocale)}
              </span>
            ) : null}
            <span className="pl-card__price">
              {formatPrice(sale, product.price.currency, numberLocale)}
            </span>
          </span>
          {product.rating != null && product.rating > 0 ? (
            <span className="pl-card__rating">
              ★ {product.rating.toFixed(1)}
              {product.reviews_count ? ` (${product.reviews_count})` : ""}
            </span>
          ) : null}
        </footer>
      </section>
    </article>
  );
}
