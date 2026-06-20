import type { ResolvedProductBuyNow } from "@/features/products/lib/product-buy-now";
import { previewBuyNowHref } from "@/features/products/lib/product-buy-now";
import type { ResolvedProductCtaConfig } from "@/features/products/lib/product-cta";
import { CtaLivePreview } from "./CtaLivePreview";

type Props = {
  buyNow: ResolvedProductBuyNow;
  quoteCta: ResolvedProductCtaConfig;
};

export function StorefrontButtonsLivePreview({ buyNow, quoteCta }: Props) {
  const buyHref = previewBuyNowHref(buyNow);
  const buyClass = [
    "pm-cta-prev__buy-btn",
    "prd-purchase__add-cart",
    buyNow.variant === "outline" ? "prd-purchase__add-cart--outline" : "",
    buyNow.size === "lg" ? "prd-purchase__add-cart--lg" : "",
    buyNow.fullWidth ? "prd-purchase__add-cart--full" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className="pm-storefront-preview">
      <div className="pm-cta-prev">
        <div className="pm-cta-prev__title">Live preview</div>
        <p className="pm-cta-prev__hint">
          Buy Now uses the purchase-panel style. Quote CTA uses your theme tokens below.
        </p>

        <div className="pm-cta-prev__block">
          <div className="pm-cta-prev__cap">Product page — buy box</div>
          <div className="pm-cta-prev__sheet">
            <div className="pm-cta-prev__buy">
              <span className="pm-cta-prev__fake-price">199.00 USD</span>
            </div>
            {buyNow.enabled && buyNow.placements.page ? (
              buyHref ? (
                <a href={buyHref} className={buyClass} target="_blank" rel="noopener noreferrer">
                  {buyNow.label || "Buy Now"}
                </a>
              ) : (
                <span className={`${buyClass} pm-cta-prev__buy-btn--disabled`} title="Set shop domain to enable link">
                  {buyNow.label || "Buy Now"}
                </span>
              )
            ) : (
              <span className="pm-cta-prev__muted">Buy Now hidden (disabled or placement off)</span>
            )}
          </div>
        </div>

        {buyNow.enabled && buyNow.placements.card ? (
          <div className="pm-cta-prev__block">
            <div className="pm-cta-prev__cap">Product card — Buy Now</div>
            <div className="pm-cta-prev__card pm-cta-prev__card--floating_corner">
              <div className="pm-cta-prev__card-media" />
              <div className="pm-cta-prev__card-body">
                <div className="pm-cta-prev__card-t">Sample product</div>
                <div className="pm-cta-prev__card-meta">
                  <span>199 USD</span>
                </div>
              </div>
              <div className="pm-cta-prev__card-cta">
                <span className="pl-card__buy-now">{buyNow.label || "Buy Now"}</span>
              </div>
            </div>
            {buyHref ? (
              <p className="pm-cta-prev__url">
                <code>{buyHref}</code>
              </p>
            ) : null}
          </div>
        ) : null}
      </div>

      {quoteCta.enabled ? (
        <div className="pm-storefront-preview__quote">
          <CtaLivePreview cfg={quoteCta} />
        </div>
      ) : (
        <p className="pm-cta-prev__muted pm-storefront-preview__off">Quote CTA is disabled.</p>
      )}
    </div>
  );
}
