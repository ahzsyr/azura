"use client";

import React, { useCallback, useEffect, useState } from "react";
import type { Product, ProductConditionOption, ProductStockStatus } from "../../types";
import {
  resolveDeliveryOptionsForProduct,
  type NormalizedDeliveryOption,
} from "../../lib/product-delivery";
import { isInCompareList, toggleCompareList } from "../../lib/product-lists";
import {
  isInLocalProductFavorites,
  syncFavoritesFromServer,
  toggleFavorite,
} from "@/features/account/lib/favorites-sync";
import { useCustomerSession } from "@/features/account/lib/use-customer-session";
import type { ResolvedProductPageDisplay, ProductPageSideOrderKey } from "../../lib/product-page-display";
import type { ResolvedProductBuyNow } from "../../lib/product-buy-now";
import type { ShopperCurrencyContext } from "../../lib/currency/types";
import type { PdpLabels } from "../../pdp/load-pdp-labels";
import { ProductPriceDisplay } from "./product-price-display";

export type ProductPurchasePanelPrices = {
  sale: number;
  compare: number | null;
  displayCode: string;
  numberLocale: string;
};

type Props = {
  locale: string;
  product: Product;
  productId: string;
  deliveryOptions: NormalizedDeliveryOption[];
  labels: PdpLabels;
  prices: ProductPurchasePanelPrices;
  initialSku?: string;
  display: ResolvedProductPageDisplay;
  buyNow: ResolvedProductBuyNow;
  buyNowHref: string | null;
  currencyCtx: ShopperCurrencyContext;
  conditionInVariations?: boolean;
  sectionOrder?: ProductPageSideOrderKey[];
};

const DEFAULT_PURCHASE_ORDER: ProductPageSideOrderKey[] = [
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

const CONDITION_KEYS: Record<ProductConditionOption, keyof PdpLabels> = {
  new: "conditionNew",
  used: "conditionUsed",
  refurbished: "conditionRefurbished",
};

function stockLabel(status: ProductStockStatus, labels: PdpLabels): string {
  if (status === "preorder") return labels.preOrder;
  if (status === "out_of_stock") return labels.outOfStock;
  return labels.inStock;
}

function discountPercent(sale: number, compare: number | null): number {
  if (compare == null || compare <= 0 || sale >= compare) return 0;
  return Math.round(((compare - sale) / compare) * 100);
}

export function ProductPurchasePanel({
  locale,
  product,
  productId,
  deliveryOptions,
  labels,
  prices,
  initialSku,
  display,
  buyNow,
  buyNowHref,
  currencyCtx,
  conditionInVariations = false,
  sectionOrder,
}: Props) {
  const stockStatus: ProductStockStatus = product.stock_status || "in_stock";
  const outOfStock = stockStatus === "out_of_stock";
  const conditions = product.condition_options ?? [];
  const showConditionPills =
    display.condition.enabled && conditions.length > 0 && !conditionInVariations;

  const [quantity, setQuantity] = useState(1);
  const [condition, setCondition] = useState<ProductConditionOption>(conditions[0] ?? "new");
  const [deliveryLoading, setDeliveryLoading] = useState(true);
  const [deliveryReady, setDeliveryReady] = useState<NormalizedDeliveryOption[]>([]);
  const [selectedDeliveryId, setSelectedDeliveryId] = useState("");
  const { isLoggedIn } = useCustomerSession();
  const [compareOn, setCompareOn] = useState(false);
  const [savedOn, setSavedOn] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [displaySku, setDisplaySku] = useState(
    initialSku ?? product.mpn ?? product.manufacturer_part_number ?? "-",
  );
  const [displaySale, setDisplaySale] = useState(prices.sale);
  const [displayCompare, setDisplayCompare] = useState<number | null>(prices.compare);

  const showActions = display.compare.enabled || display.saveToList.enabled;
  const cartLabel = buyNow.label || labels.buyNow;
  const showBuyNow =
    display.buyNow.enabled && buyNow.enabled && buyNow.placements.page;
  const buyNowLinkReady = Boolean(buyNowHref);
  const cartEnabled = showBuyNow && buyNowLinkReady;
  const pct = discountPercent(displaySale, displayCompare);

  useEffect(() => {
    setCompareOn(isInCompareList(productId));
    if (isLoggedIn) {
      void syncFavoritesFromServer().then(() => {
        setSavedOn(isInLocalProductFavorites(productId));
      });
    } else {
      setSavedOn(isInLocalProductFavorites(productId));
    }
  }, [productId, isLoggedIn]);

  useEffect(() => {
    if (!display.delivery.enabled) return;
    setDeliveryLoading(true);
    const timer = window.setTimeout(() => {
      const opts =
        deliveryOptions.length > 0 ? deliveryOptions : resolveDeliveryOptionsForProduct(product);
      setDeliveryReady(opts);
      setSelectedDeliveryId(opts[0]?.id ?? "");
      setDeliveryLoading(false);
    }, 400);
    return () => window.clearTimeout(timer);
  }, [deliveryOptions, product, display.delivery.enabled]);

  useEffect(() => {
    const onVariation = (event: Event) => {
      const detail = (
        event as CustomEvent<{ sku?: string; price?: number; compare?: number | null }>
      ).detail;
      if (detail?.sku) setDisplaySku(detail.sku);
      if (typeof detail?.price === "number" && Number.isFinite(detail.price)) {
        setDisplaySale(detail.price);
      }
      if (detail && "compare" in detail) {
        setDisplayCompare(
          typeof detail.compare === "number" && Number.isFinite(detail.compare)
            ? detail.compare
            : null,
        );
      }
    };
    window.addEventListener("product:variation-change", onVariation);
    return () => window.removeEventListener("product:variation-change", onVariation);
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 2800);
    return () => window.clearTimeout(t);
  }, [toast]);

  const showToast = useCallback((message: string) => setToast(message), []);

  const onCompare = () => {
    const result = toggleCompareList(productId);
    if (result === "full") {
      showToast(labels.compareFull);
      return;
    }
    setCompareOn(result === "added");
    showToast(result === "added" ? labels.compareAdded : labels.compareRemoved);
  };

  const onSave = async () => {
    setSaveLoading(true);
    try {
      const added = await toggleFavorite({
        entityType: "CATALOG_PRODUCT",
        entityId: productId,
        locale,
        isLoggedIn,
      });
      setSavedOn(added);
      showToast(added ? labels.saveAdded : labels.saveRemoved);
    } catch {
      showToast(labels.saveRemoved);
    } finally {
      setSaveLoading(false);
    }
  };

  const conditionLabel = (opt: ProductConditionOption) => {
    const key = CONDITION_KEYS[opt];
    return labels[key] ?? opt.charAt(0).toUpperCase() + opt.slice(1);
  };

  const keySpecRows = [
    { label: labels.warranty, value: product.warranty },
    { label: labels.mpn, value: displaySku },
    { label: labels.ean, value: product.ean },
    { label: labels.brand, value: product.brand },
    {
      label: labels.category,
      value: product.category || product.categories?.[0],
    },
  ].filter((row) => row.value);

  const priceProps = {
    ctx: currencyCtx,
    displayCode: prices.displayCode,
    numberLocale: prices.numberLocale,
  };

  const cartClassName = [
    "prd-purchase__add-cart",
    "prd-purchase__buy-now",
    buyNow.variant === "outline" ? "prd-purchase__add-cart--outline prd-purchase__buy-now--outline" : "",
    buyNow.size === "lg" ? "prd-purchase__add-cart--lg prd-purchase__buy-now--lg" : "",
    buyNow.fullWidth ? "prd-purchase__add-cart--full prd-purchase__buy-now--full" : "",
  ]
    .filter(Boolean)
    .join(" ");

  const order = sectionOrder ?? DEFAULT_PURCHASE_ORDER;
  const actionKeys = order.filter((k) => k === "compare" || k === "saveToList");
  const rendered = new Set<string>();
  const sections: React.ReactNode[] = [];

  const renderActions = () => {
    if (rendered.has("actions")) return null;
    const buttons = actionKeys.filter((k) => {
      if (k === "compare") return display.compare.enabled;
      if (k === "saveToList") return display.saveToList.enabled;
      return false;
    });
    if (buttons.length === 0) return null;
    rendered.add("actions");
    return (
      <div className="prd-purchase__actions" aria-label="Product actions">
        {buttons.map((k) =>
          k === "compare" ? (
            <button
              key="compare"
              type="button"
              className={`prd-purchase__action${compareOn ? " is-active" : ""}`}
              data-prd-compact-key="compare"
              onClick={onCompare}
              aria-pressed={compareOn}
              title={labels.compare}
            >
              <span className="prd-purchase__action-icon" aria-hidden="true">
                ⇄
              </span>
              <span className="prd-purchase__action-label">{labels.compare}</span>
            </button>
          ) : (
            <button
              key="save"
              type="button"
              className={`prd-purchase__action${savedOn ? " is-active" : ""}`}
              data-prd-compact-key="saveToList"
              onClick={() => void onSave()}
              disabled={saveLoading}
              aria-pressed={savedOn}
              title={labels.saveList}
            >
              <span className="prd-purchase__action-icon" aria-hidden="true">
                ♡
              </span>
              <span className="prd-purchase__action-label">{labels.saveList}</span>
            </button>
          ),
        )}
      </div>
    );
  };

  for (const key of order) {
    if (key === "compare" || key === "saveToList") {
      const actions = renderActions();
      if (actions) sections.push(actions);
      continue;
    }

    if (key === "price" && display.price.enabled && !rendered.has("price")) {
      rendered.add("price");
      sections.push(
        <div key="price" className="prd-purchase__price" data-purchase-price data-prd-compact-key="price">
          <ProductPriceDisplay amount={displaySale} {...priceProps} />
          {displayCompare != null && displayCompare > 0 ? (
            <>
              <small className="prd-purchase__old-price">
                <ProductPriceDisplay amount={displayCompare} {...priceProps} />
              </small>
              {pct > 0 ? <span className="prd-purchase__badge">-{pct}%</span> : null}
            </>
          ) : null}
        </div>,
      );
      continue;
    }

    if (key === "stock" && display.stock.enabled && !rendered.has("stock")) {
      rendered.add("stock");
      sections.push(
        <div key="stock" className={`prd-purchase__stock is-${stockStatus}`} data-prd-compact-key="stock">
          <span>{stockLabel(stockStatus, labels)}</span>
          <button
            type="button"
            className="prd-purchase__stock-tip"
            aria-describedby="prd-stock-tooltip"
            title={labels.stockTooltip}
          >
            ?
          </button>
          <span id="prd-stock-tooltip" className="prd-purchase__stock-tooltip" role="tooltip">
            {labels.stockTooltip}
          </span>
        </div>,
      );
      continue;
    }

    if (key === "condition" && showConditionPills && !rendered.has("condition")) {
      rendered.add("condition");
      sections.push(
        <div key="condition" className="prd-purchase__conditions" data-prd-compact-key="condition">
          <span className="prd-purchase__field-label">{labels.condition}</span>
          <div className="prd-purchase__pills" role="group" aria-label="Condition">
            {conditions.map((opt) => (
              <button
                key={opt}
                type="button"
                className={`prd-purchase__pill${condition === opt ? " is-active" : ""}`}
                aria-pressed={condition === opt}
                onClick={() => setCondition(opt)}
              >
                {conditionLabel(opt)}
              </button>
            ))}
          </div>
        </div>,
      );
      continue;
    }

    if (key === "delivery" && display.delivery.enabled && !rendered.has("delivery")) {
      rendered.add("delivery");
      sections.push(
        <div key="delivery" className="prd-purchase__delivery" data-prd-compact-key="delivery">
          <span className="prd-purchase__field-label">{labels.deliveryHeading}</span>
          {deliveryLoading ? (
            <div className="prd-purchase__delivery-skeleton" aria-busy="true" aria-label="Loading delivery options">
              <div className="prd-purchase__skel-card" />
              <div className="prd-purchase__skel-card" />
            </div>
          ) : (
            <div className="prd-purchase__delivery-grid" role="radiogroup" aria-label="Delivery options">
              {deliveryReady.map((opt) => (
                <label
                  key={opt.id}
                  className={`prd-purchase__delivery-card${selectedDeliveryId === opt.id ? " is-active" : ""}`}
                >
                  <input
                    type="radio"
                    name="delivery"
                    value={opt.id}
                    checked={selectedDeliveryId === opt.id}
                    onChange={() => setSelectedDeliveryId(opt.id)}
                  />
                  <strong>{opt.label}</strong>
                  {opt.time ? <span className="prd-purchase__delivery-time">{opt.time}</span> : null}
                  {opt.price ? <span className="prd-purchase__delivery-price">{opt.price}</span> : null}
                </label>
              ))}
            </div>
          )}
        </div>,
      );
      continue;
    }

    if (key === "quantity" && showBuyNow && display.quantity.enabled && !rendered.has("quantity")) {
      rendered.add("quantity");
      sections.push(
        <div key="quantity" className="prd-purchase__qty" data-prd-compact-key="quantity">
          <span className="prd-purchase__field-label">{labels.quantity}</span>
          <div className="prd-purchase__qty-control">
            <button
              type="button"
              className="prd-purchase__qty-btn"
              aria-label="Decrease quantity"
              disabled={outOfStock || quantity <= 1}
              onClick={() => setQuantity((q) => Math.max(1, q - 1))}
            >
              −
            </button>
            <input
              type="number"
              min={1}
              max={99}
              value={quantity}
              disabled={outOfStock}
              aria-label={labels.quantity}
              onChange={(e) => {
                const n = parseInt(e.target.value, 10);
                if (Number.isFinite(n)) setQuantity(Math.min(99, Math.max(1, n)));
              }}
            />
            <button
              type="button"
              className="prd-purchase__qty-btn"
              aria-label="Increase quantity"
              disabled={outOfStock || quantity >= 99}
              onClick={() => setQuantity((q) => Math.min(99, q + 1))}
            >
              +
            </button>
          </div>
        </div>,
      );
      continue;
    }

    if (key === "buyNow" && showBuyNow && !rendered.has("buyNow")) {
      rendered.add("buyNow");
      const disabledTitle =
        buyNow.destinationType === "whatsapp"
          ? "Set WhatsApp phone number to enable link"
          : "Set shop domain to enable link";
      sections.push(
        buyNowHref ? (
          <a
            key="buyNow"
            href={buyNowHref}
            className={cartClassName}
            data-prd-compact-key="buyNow"
            data-buy-now
            data-cart-variant={buyNow.variant}
            data-cart-size={buyNow.size}
            target={buyNow.openInNewTab ? "_blank" : undefined}
            rel={buyNow.openInNewTab ? "noopener noreferrer" : undefined}
          >
            {cartLabel}
          </a>
        ) : (
          <span
            key="buyNow"
            className={`${cartClassName} prd-purchase__buy-now--disabled`}
            data-prd-compact-key="buyNow"
            data-buy-now
            aria-disabled="true"
            title={disabledTitle}
          >
            {cartLabel}
          </span>
        ),
      );
      continue;
    }

    if (key === "keySpecs" && display.keySpecs.enabled && keySpecRows.length > 0 && !rendered.has("keySpecs")) {
      rendered.add("keySpecs");
      sections.push(
        <table key="keySpecs" className="prd-purchase__key-specs" data-prd-compact-key="keySpecs">
          <caption className="prd-purchase__key-specs-cap">{labels.keySpecs}</caption>
          <tbody>
            {keySpecRows.map((row) => (
              <tr key={row.label}>
                <th scope="row">{row.label}</th>
                <td>{row.value}</td>
              </tr>
            ))}
          </tbody>
        </table>,
      );
    }
  }

  type Block =
    | { kind: "node"; node: React.ReactNode }
    | { kind: "priceBlock"; nodes: React.ReactNode[] }
    | { kind: "cartRow"; nodes: React.ReactNode[] };

  const blocks: Block[] = [];
  let priceNodes: React.ReactNode[] = [];
  let cartNodes: React.ReactNode[] = [];

  const flushPrice = () => {
    if (priceNodes.length) {
      blocks.push({
        kind: "priceBlock",
        nodes: priceNodes,
      });
      priceNodes = [];
    }
  };

  const flushCart = () => {
    if (cartNodes.length) {
      blocks.push({ kind: "cartRow", nodes: cartNodes });
      cartNodes = [];
    }
  };

  for (const section of sections) {
    if (typeof section !== "object" || section === null || !("key" in section)) {
      flushPrice();
      flushCart();
      blocks.push({ kind: "node", node: section });
      continue;
    }
    const k = String(section.key);
    if (k === "price" || k === "stock") {
      flushCart();
      priceNodes.push(section);
      continue;
    }
    if (k === "quantity" || k === "buyNow") {
      flushPrice();
      cartNodes.push(section);
      continue;
    }
    flushPrice();
    flushCart();
    blocks.push({ kind: "node", node: section });
  }
  flushPrice();
  flushCart();

  return (
    <div className="prd-purchase" data-product-purchase>
      {blocks.map((block, idx) => {
        if (block.kind === "priceBlock") {
          return (
            <div key={`price-block-${idx}`} className="prd-purchase__price-block">
              {block.nodes}
            </div>
          );
        }
        if (block.kind === "cartRow") {
          return (
            <div key={`cart-row-${idx}`} className="prd-purchase__cart-row prd-purchase__actions-row">
              {block.nodes}
            </div>
          );
        }
        return <React.Fragment key={`node-${idx}`}>{block.node}</React.Fragment>;
      })}
      {toast ? (
        <div className="prd-purchase__toast" role="status" aria-live="polite">
          {toast}
        </div>
      ) : null}
    </div>
  );
}
