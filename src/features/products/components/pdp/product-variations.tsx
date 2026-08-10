"use client";

import { useEffect, useMemo, useState } from "react";
import type { Product } from "../../types";
import {
  buildVariationDimensions,
  findMatchingCombination,
  initialSelectedFromDimensions,
  matrixEntryForSelected,
  type ProductPriceMatrixPayload,
} from "../../lib/product-variation-pricing";

type Props = {
  product: Product;
  priceMatrix: ProductPriceMatrixPayload;
};

export function ProductVariations({ product, priceMatrix }: Props) {
  const dimensions = useMemo(
    () => (priceMatrix.dimensions.length ? priceMatrix.dimensions : buildVariationDimensions(product)),
    [priceMatrix.dimensions, product],
  );

  const [selected, setSelected] = useState<Record<string, string>>(() =>
    initialSelectedFromDimensions(dimensions),
  );

  useEffect(() => {
    setSelected(initialSelectedFromDimensions(dimensions));
  }, [dimensions]);

  const matched = useMemo(
    () =>
      findMatchingCombination(
        product.variation_combinations as Parameters<typeof findMatchingCombination>[0],
        dimensions,
        selected,
      ),
    [product.variation_combinations, dimensions, selected],
  );

  useEffect(() => {
    if (!dimensions.length) return;
    const entry = matrixEntryForSelected(priceMatrix, selected);
    const sku = matched?.sku ?? entry.sku;
    window.dispatchEvent(
      new CustomEvent("product:variation-change", {
        detail: {
          selected,
          sku,
          price: entry.displaySale,
          compare: entry.displayCompare,
          storePrice: entry.storePrice,
        },
      }),
    );
  }, [dimensions, selected, matched, priceMatrix]);

  if (!dimensions.length) return null;

  const pick = (typeKey: string, value: string) => {
    setSelected((prev) => ({ ...prev, [typeKey]: value }));
  };

  return (
    <div className="prd-var" data-product-variations data-prd-compact-key="variations">
      {dimensions.map((dim) => {
        const current = selected[dim.type] ?? "—";
        return (
          <div key={dim.type} className="prd-var__group">
            <div className="prd-var__label">{dim.type}</div>
            <div className="prd-var__options" role="listbox" aria-label={dim.type}>
              {dim.options.map((label) => {
                const active = current === label;
                return (
                  <button
                    key={label}
                    type="button"
                    role="option"
                    aria-selected={active}
                    className={`prd-var__chip${active ? " is-active" : ""}`}
                    onClick={() => pick(dim.type, label)}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
      {matched?.sku ? (
        <div className="prd-var__sku-info">
          SKU: <span data-current-sku>{matched.sku}</span>
        </div>
      ) : null}
    </div>
  );
}
