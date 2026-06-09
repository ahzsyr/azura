import Link from "next/link";
import Image from "next/image";
import { memo, type CSSProperties } from "react";
import { IMAGE_SIZES } from "@/lib/config/performance";
import type { ProductListingRecord } from "@/features/products/listing/types";
import { ProductAddToCompare } from "@/features/products/components/product-add-to-compare";
import { ProductCtaButton } from "@/features/products/components/pdp/product-cta-button";
import { ProductBuyNowCardButton } from "@/features/products/components/listing/product-buy-now-card-button";
import { buildBuyNowHref } from "@/features/products/lib/product-buy-now";
import type { ResolvedProductBuyNow } from "@/features/products/lib/product-buy-now";
import type { ResolvedProductCtaConfig } from "@/features/products/lib/product-cta";
import type { ResolvedProductCardLayout } from "@/features/products/lib/product-storefront-layout";

type Props = {
  product: ProductListingRecord;
  href: string;
  numberLocale?: string;
  cardStyle?: CSSProperties;
  priority?: boolean;
  localePrefix?: string;
  buyNow?: ResolvedProductBuyNow;
  quoteCta?: ResolvedProductCtaConfig;
  cardLayout?: ResolvedProductCardLayout;
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

export const ProductListingCard = memo(function ProductListingCard({
  product,
  href,
  numberLocale = "en-US",
  cardStyle,
  priority = false,
  localePrefix = "en",
  buyNow,
  quoteCta,
  cardLayout,
}: Props) {
  const sale = product.price.value;
  const compare = product.old_price;
  const discountPercent =
    compare && compare > sale ? Math.round(((compare - sale) / compare) * 100) : 0;

  const buyNowHref =
    buyNow?.enabled && buyNow.placements.card
      ? buildBuyNowHref(buyNow, product.slug)
      : null;
  const showQuoteCta =
    quoteCta?.enabled && quoteCta.placements.card && Boolean(quoteCta.label);
  const showBuyNow = Boolean(buyNowHref);
  const quoteLayout = quoteCta?.cardLayout ?? "floating_corner";
  const quickBuy = showBuyNow && (cardLayout?.showQuickAction ?? false);

  const quoteCtaNode =
    showQuoteCta && quoteCta ? (
      <ProductCtaButton config={quoteCta} localePrefix={localePrefix} placement="card" />
    ) : null;
  const buyNowNode =
    showBuyNow && buyNowHref && buyNow ? (
      <ProductBuyNowCardButton config={buyNow} href={buyNowHref} />
    ) : null;

  return (
    <article
      className="pl-card"
      data-product-slug={product.slug}
      data-pl-card-has-cta={showBuyNow || showQuoteCta ? "" : undefined}
      style={cardStyle}
    >
      <div className="pl-card__compare">
        <ProductAddToCompare productId={product.id} />
      </div>
      {discountPercent > 0 ? <span className="pl-card__discount">-{discountPercent}%</span> : null}
      {quickBuy ? (
        <div className="pl-card__quick-action" data-pl-cta-layout="quick_action">
          {buyNowNode}
        </div>
      ) : null}
      {quoteLayout === "overlay" && quoteCtaNode ? (
        <div className="pl-card__cta-overlay" data-pl-cta-layout="overlay">
          {quoteCtaNode}
        </div>
      ) : null}
      {!quickBuy && showBuyNow && quoteLayout === "floating_corner" ? (
        <div className="pl-card__cta-floating pl-card__cta-floating--buy" data-pl-cta-layout="floating_corner">
          {buyNowNode}
        </div>
      ) : null}
      <Link href={href} className="pl-card__media-link" aria-label={`${product.name} — view product`}>
        {product.primary_image ? (
          <Image
            className="pl-card__media-img"
            src={product.primary_image}
            alt={product.name}
            width={480}
            height={480}
            sizes={IMAGE_SIZES.card}
            priority={priority}
            loading={priority ? undefined : "lazy"}
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
        {quoteLayout === "inline_meta" && quoteCtaNode ? (
          <div className="pl-card__cta-inline" data-pl-cta-layout="inline_meta">
            {quoteCtaNode}
          </div>
        ) : null}
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
        {quoteLayout === "bottom_bar" && (buyNowNode || quoteCtaNode) ? (
          <div className="pl-card__cta-bar" data-pl-cta-layout="bottom_bar">
            {buyNowNode}
            {quoteCtaNode}
          </div>
        ) : null}
        {!quickBuy && showBuyNow && quoteLayout !== "bottom_bar" && quoteLayout !== "floating_corner" && quoteLayout !== "overlay" && quoteLayout !== "inline_meta" ? (
          <div className="pl-card__cta-floating pl-card__cta-floating--buy" data-pl-cta-layout="floating_corner">
            {buyNowNode}
          </div>
        ) : null}
        {quoteLayout === "floating_corner" && quoteCtaNode ? (
          <div className="pl-card__cta-floating pl-card__cta-floating--quote" data-pl-cta-layout="floating_corner">
            {quoteCtaNode}
          </div>
        ) : null}
      </section>
    </article>
  );
});
