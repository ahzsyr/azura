import type { ResolvedProductBuyNow } from "@/features/products/lib/product-buy-now";
import { previewBuyNowHref } from "@/features/products/lib/product-buy-now";
import {
  diagnosticsForSurface,
  resolveProductActionVisibility,
} from "@/features/products/lib/resolve-product-action-visibility";
import type { ProductActionVisibilityContext } from "./ProductActionVisibilityPanel";

export function BuyNowLivePreview({
  buyNow,
  visibilityContext,
}: {
  buyNow: ResolvedProductBuyNow;
  visibilityContext?: ProductActionVisibilityContext;
}) {
  const buyHref = previewBuyNowHref(buyNow);
  const diagnostics = visibilityContext
    ? resolveProductActionVisibility({ ...visibilityContext, buyNow })
    : null;
  const pdpVisible =
    diagnostics?.find((d) => d.action === "buyNow" && d.surface === "pdpBuyBox")?.visible ??
    (buyNow.enabled && buyNow.placements.page);
  const cardVisible =
    diagnostics?.find((d) => d.action === "buyNow" && d.surface === "card")?.visible ??
    (buyNow.enabled && buyNow.placements.card);

  const pdpFail = visibilityContext
    ? diagnosticsForSurface(diagnostics ?? [], "buyNow", "pdpBuyBox")?.gates.find((g) => !g.pass)
    : undefined;
  const cardFail = visibilityContext
    ? diagnosticsForSurface(diagnostics ?? [], "buyNow", "card")?.gates.find((g) => !g.pass)
    : undefined;

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
    <div className="pm-cta-prev">
      <div className="pm-cta-prev__title">Live preview</div>
      <p className="pm-cta-prev__hint">
        Reflects storefront visibility gates. Muted blocks are hidden on the live site.
      </p>

      <div className={`pm-cta-prev__block${pdpVisible ? "" : " pm-cta-prev__block--muted"}`}>
        <div className="pm-cta-prev__cap">Product page — buy box</div>
        <div className="pm-cta-prev__sheet">
          <div className="pm-cta-prev__buy">
            <span className="pm-cta-prev__fake-price">199.00 USD</span>
          </div>
          {pdpVisible ? (
            buyHref ? (
              <a href={buyHref} className={buyClass} target="_blank" rel="noopener noreferrer">
                {buyNow.label || "Buy Now"}
              </a>
            ) : (
              <span
                className={`${buyClass} pm-cta-prev__buy-btn--disabled`}
                title={
                  buyNow.destinationType === "whatsapp"
                    ? "Set WhatsApp phone number to enable link"
                    : "Set shop domain to enable link"
                }
              >
                {buyNow.label || "Buy Now"}
              </span>
            )
          ) : (
            <span className="pm-cta-prev__muted">{pdpFail?.detail ?? pdpFail?.label ?? "Buy Now hidden"}</span>
          )}
        </div>
      </div>

      <div className={`pm-cta-prev__block${cardVisible ? "" : " pm-cta-prev__block--muted"}`}>
        <div className="pm-cta-prev__cap">Product card</div>
        {cardVisible ? null : (
          <p className="pm-cta-prev__muted">{cardFail?.detail ?? cardFail?.label ?? "Hidden on product cards"}</p>
        )}
        <div className="pm-cta-prev__card pm-cta-prev__card--floating_corner">
          <div className="pm-cta-prev__card-media" />
          <div className="pm-cta-prev__card-body">
            <div className="pm-cta-prev__card-t">Sample product</div>
            <div className="pm-cta-prev__card-meta">
              <span>199 USD</span>
            </div>
          </div>
          <div className="pm-cta-prev__card-cta">
            <span
              className="pl-card__buy-now"
              style={cardVisible ? undefined : { opacity: 0.45 }}
            >
              {buyNow.label || "Buy Now"}
            </span>
          </div>
        </div>
        {cardVisible && buyHref ? (
          <p className="pm-cta-prev__url">
            <code>{buyHref}</code>
          </p>
        ) : null}
      </div>
    </div>
  );
}
