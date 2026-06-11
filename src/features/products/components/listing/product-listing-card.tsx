"use client";

import Image from "next/image";
import { memo, type CSSProperties } from "react";
import { Link as LocaleLink } from "@/i18n/navigation";
import { stripAnyLocalePrefix } from "@/i18n/url-helpers";
import { IMAGE_SIZES } from "@/lib/config/performance";
import { sharedElementAttrs, sharedElementRootAttrs } from "@/lib/navigation/shared-elements";
import type { ProductListingRecord } from "@/features/products/listing/types";
import { ProductAddToCompare } from "@/features/products/components/product-add-to-compare";
import { ProductCtaButton } from "@/features/products/components/pdp/product-cta-button";
import { ProductBuyNowCardButton } from "@/features/products/components/listing/product-buy-now-card-button";
import { buildBuyNowHref } from "@/features/products/lib/product-buy-now";
import type { ResolvedProductBuyNow } from "@/features/products/lib/product-buy-now";
import type { ResolvedProductCtaConfig } from "@/features/products/lib/product-cta";
import type { ResolvedProductCardLayout } from "@/features/products/lib/product-storefront-layout";
import type { ResolvedProductPageDisplay } from "@/features/products/lib/product-page-display";

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
  pageDisplay?: ResolvedProductPageDisplay;
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
  pageDisplay,
}: Props) {
  const sale = product.price.value;
  const compare = product.old_price;
  const discountPercent =
    compare && compare > sale ? Math.round(((compare - sale) / compare) * 100) : 0;

  const preferCtaAsPrimary = (cardLayout?.cardPrimaryAction ?? "buy_now") === "cta";
  const buyNowHref =
    !preferCtaAsPrimary &&
    pageDisplay?.buyNow.enabled !== false &&
    buyNow?.enabled &&
    buyNow.placements.card
      ? buildBuyNowHref(buyNow, product.slug)
      : null;
  const showQuoteCta =
    quoteCta?.enabled && quoteCta.placements.card && Boolean(quoteCta.label);
  const showBuyNow = Boolean(buyNowHref);
  const quoteLayout = quoteCta?.cardLayout ?? "floating_corner";
  const showQuoteLayoutExtras = !preferCtaAsPrimary && showQuoteCta;
  const cardActionArrangement = cardLayout?.cardActionArrangement ?? "auto";

  const quoteCtaNode =
    showQuoteCta && quoteCta ? (
      <ProductCtaButton config={quoteCta} localePrefix={localePrefix} placement="card" />
    ) : null;
  const buyNowNode =
    showBuyNow && buyNowHref && buyNow ? (
      <ProductBuyNowCardButton config={buyNow} href={buyNowHref} />
    ) : null;
  const primaryActionNode = preferCtaAsPrimary ? quoteCtaNode : buyNowNode;
  const hasPrimaryAction = Boolean(primaryActionNode);
  const quickBuy = hasPrimaryAction && (cardLayout?.showQuickAction ?? false);
  const showCompare = (cardLayout?.showCompare ?? true) && pageDisplay?.compare.enabled !== false;
  const showStockBadge = pageDisplay?.stock.enabled !== false;
  const showShortDescription = pageDisplay?.shortDescription.enabled !== false;
  const showPrice = pageDisplay?.price.enabled !== false;

  const navHref = stripAnyLocalePrefix(href);
  const imageShared = sharedElementAttrs("product", product.slug, "image");
  const titleShared = sharedElementAttrs("product", product.slug, "title");

  return (
    <article
      className="pl-card"
      data-product-slug={product.slug}
      data-pl-card-has-cta={hasPrimaryAction || showQuoteLayoutExtras ? "" : undefined}
      data-pl-card-primary={preferCtaAsPrimary ? "cta" : "buy_now"}
      data-pl-card-actions={cardActionArrangement}
      style={cardStyle}
      {...sharedElementRootAttrs("product", product.slug)}
    >
      {showCompare ? (
        <div className="pl-card__compare">
          <ProductAddToCompare productId={product.id} />
        </div>
      ) : null}
      {showPrice && discountPercent > 0 ? <span className="pl-card__discount">-{discountPercent}%</span> : null}
      {quickBuy ? (
        <div className="pl-card__quick-action" data-pl-cta-layout="quick_action">
          {primaryActionNode}
        </div>
      ) : null}
      {showQuoteLayoutExtras && quoteLayout === "overlay" && quoteCtaNode ? (
        <div className="pl-card__cta-overlay" data-pl-cta-layout="overlay">
          {quoteCtaNode}
        </div>
      ) : null}
      {!quickBuy && hasPrimaryAction && quoteLayout === "floating_corner" ? (
        <div className="pl-card__cta-floating pl-card__cta-floating--buy" data-pl-cta-layout="floating_corner">
          {primaryActionNode}
        </div>
      ) : null}
      <LocaleLink href={navHref} className="pl-card__media-link" aria-label={`${product.name} — view product`}>
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
            data-shared-element={imageShared["data-shared-element"]}
            data-shared-element-type={imageShared["data-shared-element-type"]}
            data-shared-element-id={imageShared["data-shared-element-id"]}
            style={imageShared.style}
          />
        ) : (
          <span className="pl-card__placeholder">No image</span>
        )}
      </LocaleLink>
      <section className="pl-card__content">
        <LocaleLink href={navHref} className="pl-card__title-link">
          {product.brand ? <small className="pl-card__brand">{product.brand}</small> : null}
          {showStockBadge && !product.in_stock ? <span className="pl-card__stock-badge">Out of stock</span> : null}
          <h3
            className="pl-card__title ui-text-product-card"
            data-shared-element={titleShared["data-shared-element"]}
            data-shared-element-type={titleShared["data-shared-element-type"]}
            data-shared-element-id={titleShared["data-shared-element-id"]}
            style={titleShared.style}
          >
            {product.name}
          </h3>
        </LocaleLink>
        {showShortDescription && product.short_description ? <p className="pl-card__desc">{product.short_description}</p> : null}
        {showQuoteLayoutExtras && quoteLayout === "inline_meta" && quoteCtaNode ? (
          <div className="pl-card__cta-inline" data-pl-cta-layout="inline_meta">
            {quoteCtaNode}
          </div>
        ) : null}
        <footer className="pl-card__meta">
          {showPrice ? (
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
          ) : null}
          {product.rating != null && product.rating > 0 ? (
            <span className="pl-card__rating">
              ★ {product.rating.toFixed(1)}
              {product.reviews_count ? ` (${product.reviews_count})` : ""}
            </span>
          ) : null}
        </footer>
        {quoteLayout === "bottom_bar" && (hasPrimaryAction || showQuoteLayoutExtras) ? (
          <div
            className={[
              "pl-card__cta-bar",
              cardActionArrangement === "single_row" ? "pl-card__cta-bar--row" : "",
              cardActionArrangement === "stacked" ? "pl-card__cta-bar--stack" : "",
            ]
              .filter(Boolean)
              .join(" ")}
            data-pl-cta-layout="bottom_bar"
          >
            {hasPrimaryAction ? primaryActionNode : null}
            {showQuoteLayoutExtras ? quoteCtaNode : null}
          </div>
        ) : null}
        {!quickBuy && hasPrimaryAction && quoteLayout !== "bottom_bar" && quoteLayout !== "floating_corner" && quoteLayout !== "overlay" && quoteLayout !== "inline_meta" ? (
          <div className="pl-card__cta-floating pl-card__cta-floating--buy" data-pl-cta-layout="floating_corner">
            {primaryActionNode}
          </div>
        ) : null}
        {showQuoteLayoutExtras && quoteLayout === "floating_corner" && quoteCtaNode ? (
          <div className="pl-card__cta-floating pl-card__cta-floating--quote" data-pl-cta-layout="floating_corner">
            {quoteCtaNode}
          </div>
        ) : null}
      </section>
    </article>
  );
});
