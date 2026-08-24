"use client";

import Link from "next/link";
import { useMemo } from "react";
import type { ProductDetailViewModel } from "@/view-models/product-detail";
import type { ResolvedProductPageDisplay } from "@/features/products/lib/product-page-display";
import { ProductPriceDisplay } from "@/features/products/components/pdp/product-price-display";
import {
  buildVariationDimensions,
  type VariationDimension,
} from "@/features/products/lib/product-variation-pricing";
import { isColorDimension, type VariationSelection } from "@/features/products/lib/product-variation-media";
import { resolveModel3d } from "@/features/products/lib/unifi-product-sections";
import { UniFiAccessories } from "./unifi-accessories";

type Props = {
  viewModel: ProductDetailViewModel;
  sku: string;
  display: ResolvedProductPageDisplay;
  quantity: number;
  onQuantityChange: (next: number) => void;
  selectedVariations: VariationSelection;
  onVariationChange: (type: string, value: string) => void;
};

function DescriptionCopy({ text }: { text: string }) {
  const noteIndex = text.search(/\bNote\./i);
  if (noteIndex < 0) {
    return <p className="unifi-buy-col__desc">{text}</p>;
  }
  const lead = text.slice(0, noteIndex).trim();
  const note = text.slice(noteIndex).trim();
  return (
    <div className="unifi-buy-col__desc">
      {lead ? <p>{lead}</p> : null}
      <p className="unifi-buy-col__note">{note}</p>
    </div>
  );
}

function VariationGroup({
  dimension,
  selected,
  thumbnails,
  onPick,
}: {
  dimension: VariationDimension;
  selected?: string;
  thumbnails?: Record<string, string | undefined>;
  onPick: (value: string) => void;
}) {
  const current = selected || dimension.default || dimension.options[0];
  const useSwatches = isColorDimension(dimension.type);

  return (
    <div className="unifi-buy-col__variant-group">
      <div className="unifi-buy-col__variant-label">
        <span className="unifi-buy-col__variant-key">{dimension.type}: </span>
        <span>{current}</span>
      </div>
      {useSwatches ? (
        <div className="unifi-buy-col__swatches">
          {dimension.options.map((opt) => (
            <button
              key={opt}
              type="button"
              className={`unifi-buy-col__swatch${opt === current ? " unifi-buy-col__swatch--active" : ""}`}
              title={opt}
              aria-label={opt}
              aria-pressed={opt === current}
              onClick={() => onPick(opt)}
              style={
                thumbnails?.[opt]
                  ? undefined
                  : { background: opt.toLowerCase() === "white" ? "#fff" : "#212327" }
              }
            >
              {thumbnails?.[opt] ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={thumbnails[opt]} alt="" />
              ) : null}
            </button>
          ))}
        </div>
      ) : (
        <div className="unifi-buy-col__chips" role="listbox" aria-label={dimension.type}>
          {dimension.options.map((opt) => (
            <button
              key={opt}
              type="button"
              role="option"
              aria-selected={opt === current}
              className={`unifi-buy-col__chip${opt === current ? " unifi-buy-col__chip--active" : ""}`}
              onClick={() => onPick(opt)}
            >
              {opt}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function UniFiBuyColumn({
  viewModel,
  sku,
  display,
  quantity,
  onQuantityChange,
  selectedVariations,
  onVariationChange,
}: Props) {
  const { product, purchasePrices, buyNowHref, productCtaEffective, labels } = viewModel;
  const title = viewModel.title;
  const description = product.short_description || product.description || "";
  const showDescription = display.shortDescription.enabled && Boolean(description);
  const showVariations = display.variations.enabled;
  const showPrice = display.price.enabled;
  const showQuantity = display.quantity.enabled;
  const showBuyNow = display.buyNow.enabled;
  const showAccessories = display.frequentlyBought.enabled;
  const showPurchase = showPrice || showQuantity || showBuyNow;
  const dimensions = showVariations ? buildVariationDimensions(product) : [];
  const model = resolveModel3d(product);
  const ctaLabel = productCtaEffective.label || labels.buyNow || "Add to Cart";
  const accessories = (product.bought_together ?? []).filter((item) => item.name || item.title || item.url);

  const colorThumbnails = useMemo(() => {
    const map: Record<string, string | undefined> = {};
    for (const variant of model?.variants ?? []) {
      if (variant.color && variant.thumbnail) map[variant.color] = variant.thumbnail;
    }
    return map;
  }, [model?.variants]);

  return (
    <div className="unifi-buy-col">
      <div className="unifi-buy-col__header">
        <div>
          <h1 className="unifi-buy-col__title">{title}</h1>
          <p className="unifi-buy-col__sku">{sku}</p>
        </div>
        {showPrice ? (
          <div className="unifi-buy-col__header-price">
            <ProductPriceDisplay
              ctx={viewModel.currencyCtx}
              amount={purchasePrices.sale}
              displayCode={purchasePrices.displayCode}
              numberLocale={purchasePrices.numberLocale}
              className="unifi-buy-col__price unifi-buy-col__price--lg"
            />
            {purchasePrices.compare != null && purchasePrices.compare > purchasePrices.sale ? (
              <div className="unifi-buy-col__vat">
                <ProductPriceDisplay
                  ctx={viewModel.currencyCtx}
                  amount={purchasePrices.compare}
                  displayCode={purchasePrices.displayCode}
                  numberLocale={purchasePrices.numberLocale}
                />{" "}
                VAT &amp; Surcharge incl.
              </div>
            ) : null}
          </div>
        ) : null}
      </div>

      <div className="unifi-buy-col__rule" />

      {showDescription ? <DescriptionCopy text={description} /> : null}

      {dimensions.length ? (
        <div className="unifi-buy-col__variants">
          {dimensions.map((dimension) => (
            <VariationGroup
              key={dimension.type}
              dimension={dimension}
              selected={selectedVariations[dimension.type]}
              thumbnails={isColorDimension(dimension.type) ? colorThumbnails : undefined}
              onPick={(value) => onVariationChange(dimension.type, value)}
            />
          ))}
        </div>
      ) : null}

      {showPurchase ? (
        <div className="unifi-buy-col__purchase">
          <div className="unifi-buy-col__purchase-row">
            {showPrice ? (
              <ProductPriceDisplay
                ctx={viewModel.currencyCtx}
                amount={purchasePrices.sale}
                displayCode={purchasePrices.displayCode}
                numberLocale={purchasePrices.numberLocale}
                className="unifi-buy-col__price"
              />
            ) : (
              <span />
            )}
            {showQuantity ? (
              <div className="unifi-buy-col__qty">
                <button
                  type="button"
                  onClick={() => onQuantityChange(Math.max(1, quantity - 1))}
                  aria-label="Decrease quantity"
                  disabled={quantity <= 1}
                >
                  −
                </button>
                <span>{quantity}</span>
                <button type="button" onClick={() => onQuantityChange(quantity + 1)} aria-label="Increase quantity">
                  +
                </button>
              </div>
            ) : null}
          </div>
          {showBuyNow ? (
            buyNowHref ? (
              <Link href={buyNowHref} className="unifi-pdp__cta unifi-buy-col__cta">
                {ctaLabel}
              </Link>
            ) : (
              <span className="unifi-pdp__cta unifi-buy-col__cta unifi-pdp__cta--disabled">{ctaLabel}</span>
            )
          ) : null}
        </div>
      ) : null}

      {showAccessories ? (
        <UniFiAccessories
          items={accessories}
          currencyCtx={viewModel.currencyCtx}
          displayCode={purchasePrices.displayCode}
          numberLocale={purchasePrices.numberLocale}
        />
      ) : null}
    </div>
  );
}
