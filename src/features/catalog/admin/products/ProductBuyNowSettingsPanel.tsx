import type { Dispatch, SetStateAction } from "react";
import type { ResolvedProductBuyNow } from "@/features/products/lib/product-buy-now";
import { ProductBuyNowFields, ProductBuyNowChromeFields } from "./ProductBuyNowFields";
import { BuyNowLivePreview } from "./BuyNowLivePreview";
import {
  ProductActionVisibilityPanel,
  type ProductActionVisibilityContext,
} from "./ProductActionVisibilityPanel";

export function ProductBuyNowSettingsPanel({
  buyNow,
  setBuyNow,
  visibilityContext,
  onDirty,
}: {
  buyNow: ResolvedProductBuyNow;
  setBuyNow: Dispatch<SetStateAction<ResolvedProductBuyNow>>;
  visibilityContext: ProductActionVisibilityContext;
  onDirty?: () => void;
}) {
  const patch = (fn: SetStateAction<ResolvedProductBuyNow>) => {
    setBuyNow(fn);
    onDirty?.();
  };

  return (
    <section className="apm-dashboard-card apm-products-settings pm-storefront-cta" aria-labelledby="apm-buy-now-h">
      <header className="apm-dashboard-card__head">
        <h2 id="apm-buy-now-h" className="apm-dashboard-card__title">
          Buy Now / Shop Now
        </h2>
        <p className="apm-dashboard-card__lede">
          External shop link for all products: set your shop domain and slug path prefix. Per-product slug overrides are in
          each product editor. Save from the top bar.
        </p>
      </header>
      <div className="pm-cta-layout pm-storefront-cta__layout">
        <div className="pm-cta-layout__main apm-cta-form-stack">
          <div className="pm-cta-band pm-cta-band--buy">
            <ProductBuyNowFields value={buyNow} onChange={patch} />
          </div>
          <div className="pm-cta-band">
            <ProductBuyNowChromeFields value={buyNow} onChange={patch} />
          </div>
        </div>
        <aside className="pm-cta-layout__aside pm-storefront-cta__preview" aria-label="Buy Now preview">
          <ProductActionVisibilityPanel
            action="buyNow"
            context={{ ...visibilityContext, buyNow }}
            className="pm-action-visibility--aside"
          />
          <BuyNowLivePreview buyNow={buyNow} visibilityContext={{ ...visibilityContext, buyNow }} />
        </aside>
      </div>
    </section>
  );
}
