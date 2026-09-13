"use client";

import { type ReactNode } from "react";
import { Link as LocaleLink } from "@/i18n/navigation";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { ProductAddToCompare } from "@/features/products/components/product-add-to-compare";
import { ProductCtaButton } from "@/features/products/components/pdp/product-cta-button";
import { productLinkContextFromProduct } from "@/features/products/lib/product-whatsapp-link";
import { ProductQuickViewTrigger } from "@/features/products/quick-view/product-quick-view-trigger";
import { quickViewSeedFromProduct } from "@/features/products/quick-view/quick-view-seed";
import { isMediaFlipStyle } from "./product-card-media-flip";
import { ProductCardWishlistButton } from "./product-card-wishlist-button";
import type { ProductCardRenderContext } from "./product-card-context";

type Props = {
  ctx: ProductCardRenderContext;
};

const MEDIA_FLIP_QUOTE_LABEL = "Request a Quote →";
const MEDIA_FLIP_QUOTE_COMPACT_LABEL = "Quote →";

function isActionEnabled(ctx: ProductCardRenderContext, type: string): boolean {
  return ctx.design.actions.enabledTypes.includes(type as (typeof ctx.design.actions.enabledTypes)[number]);
}

function quickViewSeed(ctx: ProductCardRenderContext) {
  return quickViewSeedFromProduct(ctx.product, {
    cardDisplay: ctx.cardDisplay,
    buyNow: ctx.buyNow,
    productCta: ctx.productCta,
    commerce: {
      showBuyNow: ctx.showBuyNow,
      showProductCta: ctx.showProductCta,
      buyNowHref: ctx.buyNowHref,
    },
  });
}

function OverlayTooltip({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent side="bottom">{label}</TooltipContent>
    </Tooltip>
  );
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

  const useMediaFlipChrome = isMediaFlipStyle(ctx.design.style);
  const compareButton = showCompare ? (
    <div className="pl-card__compare">
      <ProductAddToCompare productId={ctx.product.id} />
    </div>
  ) : null;
  const wishlistButton = showWishlist ? (
    <div className="pl-card__wishlist-slot">
      <ProductCardWishlistButton productId={ctx.product.id} />
    </div>
  ) : null;

  if (!useMediaFlipChrome) {
    return (
      <div className="pl-card__overlay-actions">
        {compareButton}
        {wishlistButton}
      </div>
    );
  }

  return (
    <div className="pl-card__overlay-actions">
      {compareButton ? <OverlayTooltip label="Compare">{compareButton}</OverlayTooltip> : null}
      {wishlistButton ? (
        <OverlayTooltip label="Add to Favorites">{wishlistButton}</OverlayTooltip>
      ) : null}
    </div>
  );
}

function MediaFlipViewDetails({ ctx }: Props) {
  const mode = ctx.design.viewDetailsMode ?? "disabled";
  if (mode === "disabled") return null;

  if (mode === "quick_view") {
    if (!ctx.cardDisplay.showQuickView) return null;
    return (
      <ProductQuickViewTrigger
        slug={ctx.product.slug}
        localePrefix={ctx.localePrefix}
        seed={quickViewSeed(ctx)}
        className="pl-card__view-details"
        label="Quick View"
        showIcon={false}
      />
    );
  }

  return (
    <LocaleLink
      href={ctx.navHref}
      prefetch={ctx.linkPrefetch}
      className="pl-card__view-details"
    >
      View Details
    </LocaleLink>
  );
}

function MediaFlipQuoteCta({ ctx }: Props) {
  if (!isActionEnabled(ctx, "cta") || !ctx.showProductCta) return null;

  return (
    <div className="pl-card__quote-cta-wrap">
      <ProductCtaButton
        config={ctx.productCta}
        localePrefix={ctx.localePrefix}
        placement="card"
        displayLabel={MEDIA_FLIP_QUOTE_LABEL}
        compactDisplayLabel={MEDIA_FLIP_QUOTE_COMPACT_LABEL}
        linkContext={productLinkContextFromProduct({
          productTitle: ctx.product.name,
          name: ctx.product.name,
          slug: ctx.product.slug,
        })}
      />
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

function MediaFlipActionBar({ ctx }: Props) {
  const showBuyInBar =
    isActionEnabled(ctx, "buy_now") &&
    ctx.showBuyNow &&
    ctx.buyNowNode &&
    ctx.ctaLayout === "bottom_bar";
  const showQuoteInBar =
    isActionEnabled(ctx, "cta") &&
    ctx.showProductCta &&
    ctx.ctaLayout === "bottom_bar";
  const showViewDetails = (ctx.design.viewDetailsMode ?? "disabled") !== "disabled";
  const customs = ctx.design.actions.customActions.filter((action) => action.enabled);

  if (!showViewDetails && !showBuyInBar && !showQuoteInBar && !customs.length) return null;

  return (
    <footer className="pl-card__action-bar pl-card__action-bar--row" data-pl-cta-layout="bottom_bar">
      <MediaFlipViewDetails ctx={ctx} />
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
      {showQuoteInBar ? <MediaFlipQuoteCta ctx={ctx} /> : null}
    </footer>
  );
}

/** Quick view, Buy Now, and quote CTA on one shared action row. */
export function ProductCardActionBar({ ctx }: Props) {
  if (isMediaFlipStyle(ctx.design.style)) {
    return <MediaFlipActionBar ctx={ctx} />;
  }

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
          seed={quickViewSeed(ctx)}
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
      seed={quickViewSeed(ctx)}
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
