"use client";

import type { ProductCardRenderContext } from "./product-card-context";

type Props = {
  ctx: ProductCardRenderContext;
  /** When inline, badges render inside content flow. */
  placement?: "overlay" | "inline";
};

export function ProductCardRatingBadge({ ctx }: { ctx: ProductCardRenderContext }) {
  const { product, cardDisplay, hasRating } = ctx;
  if (!cardDisplay.showRating || !hasRating) return null;

  return (
    <span
      className="pl-card__rating-badge"
      aria-label={`Rated ${(product.rating ?? 0).toFixed(1)} out of 5${
        product.reviews_count ? `, ${product.reviews_count} reviews` : ""
      }`}
    >
      <span className="pl-card__rating-badge__star" aria-hidden="true">
        ★
      </span>
      <span className="pl-card__rating-badge__value">
        {(product.rating ?? 0).toFixed(1)}
        {product.reviews_count ? ` (${product.reviews_count})` : ""}
      </span>
    </span>
  );
}

export function ProductCardBadges({ ctx, placement = "overlay" }: Props) {
  const { badges: rawBadges, cardDisplay, design } = ctx;
  const badges = rawBadges.filter((b) => {
    if (b.type === "sale") return cardDisplay.showPrice && cardDisplay.showDiscountBadge;
    if (b.type === "low_stock") return cardDisplay.showStock;
    return true;
  });
  if (!badges.length && !(cardDisplay.showPrice && cardDisplay.showDiscountBadge && ctx.discountPercent > 0)) {
    return null;
  }

  const showSaleFromLegacy =
    cardDisplay.showPrice &&
    cardDisplay.showDiscountBadge &&
    ctx.discountPercent > 0 &&
    !badges.some((b) => b.type === "sale");

  const isInline = placement === "inline" || design.badgePosition === "inline";
  const isBottom = design.badgePosition === "bottom";

  return (
    <>
      {badges.map((badge) => (
        <span
          key={`${badge.type}-${badge.label}`}
          className={[
            "pl-card__badge",
            `pl-card__badge--${badge.type}`,
            isInline ? "pl-card__badge--inline" : "",
            isBottom ? "pl-card__badge--bottom" : "",
          ]
            .filter(Boolean)
            .join(" ")}
          data-pl-badge-type={badge.type}
        >
          {badge.label}
        </span>
      ))}
      {showSaleFromLegacy && !badges.some((b) => b.type === "sale") ? (
        <span className="pl-card__discount pl-card__badge--sale">-{ctx.discountPercent}%</span>
      ) : null}
    </>
  );
}
