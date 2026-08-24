"use client";

import { formatCardPrice } from "../product-card-price";
import type { ProductCardRenderContext } from "./product-card-context";

type Props = {
  ctx: ProductCardRenderContext;
};

export function ProductCardPricing({ ctx }: Props) {
  const { cardDisplay, priceDisplay, numberLocale } = ctx;
  if (!cardDisplay.showPrice) return null;

  const { sale, compare, currency, showCompare, showSavings, savingsAmount, discountPercent } =
    priceDisplay;

  return (
    <span className="pl-card__prices" data-prd-pricing-mode={ctx.design.pricingMode}>
      {showCompare && compare != null && compare > 0 ? (
        <span className="pl-card__old-price">
          {formatCardPrice(compare, currency, numberLocale)}
        </span>
      ) : null}
      <span className="pl-card__price">
        {formatCardPrice(sale, currency, numberLocale)}
      </span>
      {showSavings && savingsAmount > 0 ? (
        <span className="pl-card__savings">
          Save {formatCardPrice(savingsAmount, currency, numberLocale)}
          {discountPercent > 0 ? ` (${discountPercent}%)` : ""}
        </span>
      ) : null}
    </span>
  );
}
