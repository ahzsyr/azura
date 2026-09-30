"use client";

import Link from "next/link";
import type { ResolvedProductCtaConfig } from "@/features/products/lib/product-cta";
import type { ResolvedProductPageDisplay } from "@/features/products/lib/product-page-display";
import type { PdpLabels } from "@/features/products/pdp/load-pdp-labels";
import { ProductPriceDisplay } from "@/features/products/components/pdp/product-price-display";

type Props = {
  visible: boolean;
  title: string;
  sku: string;
  thumbnail?: string;
  prices: {
    sale: number;
    compare: number | null;
    displayCode: string;
    numberLocale: string;
  };
  currencyCtx: import("@/features/products/lib/currency/types").ShopperCurrencyContext;
  labels: PdpLabels;
  buyNowHref: string | null;
  productCta: ResolvedProductCtaConfig;
  display: ResolvedProductPageDisplay;
};

export function UniFiStickyPurchaseBar({
  visible,
  title,
  sku,
  thumbnail,
  prices,
  currencyCtx,
  labels,
  buyNowHref,
  productCta,
  display,
}: Props) {
  const ctaLabel = productCta.label || labels.buyNow;
  const showPrice = display.price.enabled;
  const showBuyNow = display.buyNow.enabled;

  return (
    <div className={`unifi-sticky-bar${visible ? " unifi-sticky-bar--visible" : ""}`} aria-hidden={!visible}>
      <div className="unifi-sticky-bar__inner">
        <div className="unifi-sticky-bar__identity">
          {thumbnail ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={thumbnail} alt="" className="unifi-sticky-bar__thumb" />
          ) : null}
          <div>
            <div className="unifi-sticky-bar__title">{title}</div>
            <div className="unifi-sticky-bar__sku">{sku}</div>
          </div>
        </div>
        {showPrice || showBuyNow ? (
          <div className="unifi-sticky-bar__actions">
            {showPrice ? (
              <ProductPriceDisplay
                ctx={currencyCtx}
                amount={prices.sale}
                displayCode={prices.displayCode}
                numberLocale={prices.numberLocale}
                className="unifi-sticky-bar__price"
              />
            ) : null}
            {showBuyNow ? (
              buyNowHref ? (
                <Link href={buyNowHref} className="unifi-pdp__cta unifi-sticky-bar__cta">
                  {ctaLabel}
                </Link>
              ) : (
                <span className="unifi-pdp__cta unifi-sticky-bar__cta unifi-pdp__cta--disabled">{ctaLabel}</span>
              )
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
