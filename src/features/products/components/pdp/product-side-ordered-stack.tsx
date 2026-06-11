"use client";

import type { ReactNode } from "react";
import type { ComponentProps } from "react";
import type { ProductPageSideOrderKey } from "../../lib/product-page-display";
import { isProductInfoSectionKey, ProductInfoCore, ProductInfoSection } from "./product-info-sections";
import { ProductVariations } from "./product-variations";
import { ProductPurchasePanel } from "./product-purchase-panel";

const PURCHASE_SECTION_KEYS: ProductPageSideOrderKey[] = [
  "compare",
  "saveToList",
  "price",
  "stock",
  "condition",
  "delivery",
  "quantity",
  "buyNow",
  "keySpecs",
];

type InfoProps = Omit<ComponentProps<typeof ProductInfoSection>, "section">;
type VariationsProps = ComponentProps<typeof ProductVariations>;
type PurchaseProps = Omit<ComponentProps<typeof ProductPurchasePanel>, "sectionOrder">;

type Props = {
  order: ProductPageSideOrderKey[];
  infoProps: InfoProps;
  variationsProps: VariationsProps;
  purchaseProps: PurchaseProps;
};

export function ProductSideOrderedStack({ order, infoProps, variationsProps, purchaseProps }: Props) {
  const infoKeys = order.filter((k) => isProductInfoSectionKey(k));
  const purchaseOrder = order.filter((k) => PURCHASE_SECTION_KEYS.includes(k));
  const nodes: ReactNode[] = [];
  let infoCardAdded = false;
  let purchaseAdded = false;

  for (const key of order) {
    if (isProductInfoSectionKey(key)) {
      if (!infoCardAdded) {
        nodes.push(
          <aside key="prd-info" className="prd-info" data-product-info>
            <ProductInfoCore
              product={infoProps.product}
              slug={infoProps.slug}
              labels={infoProps.labels}
              display={infoProps.display}
            />
            {infoKeys.map((k) => (
              <ProductInfoSection key={`info-${k}`} {...infoProps} section={k} />
            ))}
          </aside>,
        );
        infoCardAdded = true;
      }
      continue;
    }

    if (key === "variations") {
      if (infoProps.display.variations.enabled) {
        nodes.push(<ProductVariations key="variations" {...variationsProps} />);
      }
      continue;
    }

    if (PURCHASE_SECTION_KEYS.includes(key) && !purchaseAdded) {
      nodes.push(
        <ProductPurchasePanel
          key="purchase"
          {...purchaseProps}
          sectionOrder={purchaseOrder}
        />,
      );
      purchaseAdded = true;
    }
  }

  if (!infoCardAdded) {
    nodes.unshift(
      <aside key="prd-info" className="prd-info" data-product-info>
        <ProductInfoCore
          product={infoProps.product}
          slug={infoProps.slug}
          labels={infoProps.labels}
          display={infoProps.display}
        />
      </aside>,
    );
  }

  if (purchaseOrder.length > 0 && !purchaseAdded) {
    nodes.push(
      <ProductPurchasePanel key="purchase" {...purchaseProps} sectionOrder={purchaseOrder} />,
    );
  }

  return <>{nodes}</>;
}
