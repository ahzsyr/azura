"use client";

import { ProductAddToCompare } from "@/features/products/components/product-add-to-compare";
import { ProductQuickViewTrigger } from "@/features/products/quick-view/product-quick-view-trigger";
import { quickViewSeedFromProduct } from "@/features/products/quick-view/quick-view-seed";
import { ProductCardWishlistButton } from "./product-card-wishlist-button";
import type { ProductCardRenderContext } from "./product-card-context";

type Props = {
  ctx: ProductCardRenderContext;
};

function isActionEnabled(ctx: ProductCardRenderContext, type: string): boolean {
  return ctx.design.actions.enabledTypes.includes(type as (typeof ctx.design.actions.enabledTypes)[number]);
}

export function ProductCardCompareSlot({ ctx }: Props) {
  if (!ctx.cardDisplay.showCompare || !isActionEnabled(ctx, "compare")) return null;
  return (
    <div className="pl-card__compare">
      <ProductAddToCompare productId={ctx.product.id} />
    </div>
  );
}

export function ProductCardWishlistSlot({ ctx }: Props) {
  if (!ctx.cardDisplay.showWishlist || !isActionEnabled(ctx, "wishlist")) return null;
  return (
    <div className="pl-card__wishlist-slot">
      <ProductCardWishlistButton productId={ctx.product.id} />
    </div>
  );
}

/** Compare + wishlist in one horizontal row over the card image. */
export function ProductCardMediaOverlayActions({ ctx }: Props) {
  const showCompare = ctx.cardDisplay.showCompare && isActionEnabled(ctx, "compare");
  const showWishlist = ctx.cardDisplay.showWishlist && isActionEnabled(ctx, "wishlist");
  if (!showCompare && !showWishlist) return null;

  return (
    <div className="pl-card__overlay-actions">
      {showCompare ? (
        <div className="pl-card__compare">
          <ProductAddToCompare productId={ctx.product.id} />
        </div>
      ) : null}
      {showWishlist ? (
        <div className="pl-card__wishlist-slot">
          <ProductCardWishlistButton productId={ctx.product.id} />
        </div>
      ) : null}
    </div>
  );
}

export function ProductCardQuickAction({ ctx }: Props) {
  if (
    !isActionEnabled(ctx, "buy_now") ||
    !ctx.showBuyNow ||
    ctx.ctaLayout !== "quick_action" ||
    !ctx.buyNowNode
  ) {
    return null;
  }
  return (
    <div className="pl-card__quick-action" data-pl-cta-layout="quick_action">
      {ctx.buyNowNode}
    </div>
  );
}

export function ProductCardOverlayCta({ ctx }: Props) {
  if (!isActionEnabled(ctx, "cta") || ctx.ctaLayout !== "overlay" || !ctx.productCtaNode) return null;
  return (
    <div className="pl-card__cta-overlay" data-pl-cta-layout="overlay">
      {ctx.productCtaNode}
    </div>
  );
}

export function ProductCardFloatingBuy({ ctx }: Props) {
  if (
    !isActionEnabled(ctx, "buy_now") ||
    !ctx.showBuyNow ||
    ctx.ctaLayout !== "floating_corner" ||
    !ctx.buyNowNode
  ) {
    return null;
  }
  return (
    <div
      className="pl-card__cta-floating pl-card__cta-floating--buy"
      data-pl-cta-layout="floating_corner"
    >
      {ctx.buyNowNode}
    </div>
  );
}

export function ProductCardFloatingCta({ ctx }: Props) {
  if (!isActionEnabled(ctx, "cta") || ctx.ctaLayout !== "floating_corner" || !ctx.productCtaNode) {
    return null;
  }
  return (
    <div
      className="pl-card__cta-floating pl-card__cta-floating--quote"
      data-pl-cta-layout="floating_corner"
    >
      {ctx.productCtaNode}
    </div>
  );
}

export function ProductCardBottomBar({ ctx }: Props) {
  return <ProductCardActionBar ctx={ctx} />;
}

/** Quick view, Buy Now, and quote CTA on one shared action row. */
export function ProductCardActionBar({ ctx }: Props) {
  const showQuickView = ctx.cardDisplay.showQuickView && isActionEnabled(ctx, "quick_view");
  const showBuyInBar =
    isActionEnabled(ctx, "buy_now") &&
    ctx.showBuyNow &&
    ctx.buyNowNode &&
    (ctx.ctaLayout === "bottom_bar" ||
      ctx.ctaLayout === "overlay" ||
      ctx.ctaLayout === "inline_meta");
  const showQuoteInBar =
    isActionEnabled(ctx, "cta") &&
    ctx.showProductCta &&
    ctx.productCtaNode &&
    ctx.ctaLayout === "bottom_bar";
  const customs = ctx.design.actions.customActions.filter((action) => action.enabled);

  if (!showQuickView && !showBuyInBar && !showQuoteInBar && !customs.length) return null;

  const arrangementClass =
    ctx.cardActionArrangement === "single_row"
      ? "pl-card__action-bar--row"
      : ctx.cardActionArrangement === "stacked"
        ? "pl-card__action-bar--stack"
        : "";

  return (
    <footer
      className={["pl-card__action-bar", arrangementClass].filter(Boolean).join(" ")}
      data-pl-cta-layout="bottom_bar"
    >
      {showQuickView ? (
        <ProductQuickViewTrigger
          slug={ctx.product.slug}
          localePrefix={ctx.localePrefix}
          seed={quickViewSeedFromProduct(ctx.product, {
            cardDisplay: ctx.cardDisplay,
            buyNow: ctx.buyNow,
            productCta: ctx.productCta,
            commerce: {
              showBuyNow: ctx.showBuyNow,
              showProductCta: ctx.showProductCta,
              buyNowHref: ctx.buyNowHref,
            },
          })}
          className="pl-card__quick-view"
        />
      ) : null}
      {customs.map((action) => (
        <a
          key={action.id}
          href={action.href}
          className="pl-card__custom-action"
          target={action.openInNewTab ? "_blank" : undefined}
          rel={action.openInNewTab ? "noopener noreferrer" : undefined}
        >
          {action.label}
        </a>
      ))}
      {showBuyInBar ? ctx.buyNowNode : null}
      {showQuoteInBar ? ctx.productCtaNode : null}
    </footer>
  );
}

/** @deprecated Use ProductCardActionBar */
export const ProductCardFooterActions = ProductCardActionBar;

export function ProductCardQuickViewSlot({ ctx }: Props) {
  if (!ctx.cardDisplay.showQuickView || !isActionEnabled(ctx, "quick_view")) return null;
  return (
    <ProductQuickViewTrigger
      slug={ctx.product.slug}
      localePrefix={ctx.localePrefix}
      seed={quickViewSeedFromProduct(ctx.product, {
        cardDisplay: ctx.cardDisplay,
        buyNow: ctx.buyNow,
        productCta: ctx.productCta,
        commerce: {
          showBuyNow: ctx.showBuyNow,
          showProductCta: ctx.showProductCta,
          buyNowHref: ctx.buyNowHref,
        },
      })}
      className="pl-card__quick-view"
    />
  );
}

export function ProductCardCustomActions({ ctx }: Props) {
  const customs = ctx.design.actions.customActions.filter((a) => a.enabled);
  if (!customs.length) return null;
  return (
    <div className="pl-card__custom-actions">
      {customs.map((action) => (
        <a
          key={action.id}
          href={action.href}
          className="pl-card__custom-action"
          target={action.openInNewTab ? "_blank" : undefined}
          rel={action.openInNewTab ? "noopener noreferrer" : undefined}
        >
          {action.label}
        </a>
      ))}
    </div>
  );
}

export function ProductCardFallbackFloatingBuy({ ctx }: Props) {
  if (
    !isActionEnabled(ctx, "buy_now") ||
    !ctx.showBuyNow ||
    ctx.ctaLayout === "bottom_bar" ||
    ctx.ctaLayout === "floating_corner" ||
    ctx.ctaLayout === "overlay" ||
    ctx.ctaLayout === "inline_meta" ||
    !ctx.buyNowNode
  ) {
    return null;
  }
  return (
    <div
      className="pl-card__cta-floating pl-card__cta-floating--buy"
      data-pl-cta-layout="floating_corner"
    >
      {ctx.buyNowNode}
    </div>
  );
}
