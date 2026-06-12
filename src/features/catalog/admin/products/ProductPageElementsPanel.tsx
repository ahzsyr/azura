import type {
  ResolvedProductPageDisplay,
  ResolvedProductPageElementOrder,
} from "@/features/products/lib/product-page-display";
import {
  PRODUCT_PAGE_MAIN_ORDER_KEYS,
  PRODUCT_PAGE_SIDE_ORDER_KEYS,
  PRODUCT_PAGE_ELEMENT_LABELS,
} from "@/features/products/lib/product-page-display";
import {
  PRODUCT_PAGE_COMPACT_ELEMENT_KEYS,
  PRODUCT_PAGE_COMPACT_ELEMENT_LABELS,
  type ProductPageCompactElementKey,
  type ResolvedProductPageCompactDisplay,
} from "@/features/products/lib/product-page-compact-display";
import { ProductPageElementOrderList } from "./ProductPageElementOrderList";

type Props = {
  pageDisplay: ResolvedProductPageDisplay;
  setPageDisplay: (v: ResolvedProductPageDisplay) => void;
  elementOrder: ResolvedProductPageElementOrder;
  setElementOrder: (v: ResolvedProductPageElementOrder) => void;
  compactDisplay: ResolvedProductPageCompactDisplay;
  setCompactDisplay: (v: ResolvedProductPageCompactDisplay) => void;
  onDirty?: () => void;
};

const CHROME_KEYS = ["breadcrumb", "sideBuyBox", "floatingCta"] as const;
const TAB_KEYS = [
  "tabDescription",
  "tabSpecs",
  "tabDocuments",
  "tabShipping",
  "tabReviews",
] as const;

export function ProductPageElementsPanel({
  pageDisplay,
  setPageDisplay,
  elementOrder,
  setElementOrder,
  compactDisplay,
  setCompactDisplay,
  onDirty,
}: Props) {
  const patchDisplay = (key: keyof ResolvedProductPageDisplay, enabled: boolean) => {
    setPageDisplay({ ...pageDisplay, [key]: { enabled } });
    onDirty?.();
  };

  const patchCompactElement = (key: ProductPageCompactElementKey, enabled: boolean) => {
    const elements = { ...compactDisplay.elements, [key]: enabled };
    if (key !== "title") elements.title = true;
    const visibleKeys = PRODUCT_PAGE_COMPACT_ELEMENT_KEYS.filter((k) => elements[k]);
    setCompactDisplay({ ...compactDisplay, elements, visibleKeys });
    onDirty?.();
  };

  return (
    <div className="apm-tab-panel apm-pe-panel apm-products-settings">
      <header className="apm-dash-intro">
        <h2 className="apm-dash-intro__title">Product page elements</h2>
        <p className="apm-dash-intro__sub">
          Reorder and toggle blocks on the product detail page. Price, stock, compare, short
          description, trust (rating), and buy now also affect product cards in listings and CMS
          blocks. Configure Buy Now, promo, and trust content on their dedicated tabs. Per-product
          visibility overrides live in each product&apos;s Page Display editor. Save from the top
          bar.
        </p>
      </header>

      <div className="apm-pe-zones">
        <ProductPageElementOrderList
          title="Product page main"
          description="Scroll column below the gallery area."
          keys={PRODUCT_PAGE_MAIN_ORDER_KEYS}
          order={elementOrder.main}
          display={pageDisplay}
          onOrderChange={(main) => {
            setElementOrder({ ...elementOrder, main: main as ResolvedProductPageElementOrder["main"] });
            onDirty?.();
          }}
          onToggle={patchDisplay}
        />
        <ProductPageElementOrderList
          title="Product page side"
          description="Buy box column on desktop."
          keys={PRODUCT_PAGE_SIDE_ORDER_KEYS}
          order={elementOrder.side}
          display={pageDisplay}
          onOrderChange={(side) => {
            setElementOrder({ ...elementOrder, side: side as ResolvedProductPageElementOrder["side"] });
            onDirty?.();
          }}
          onToggle={patchDisplay}
        />
      </div>

      <fieldset className="apm-fieldset apm-pe-chrome">
        <legend className="apm-fieldset__legend">Chrome &amp; tabs</legend>
        <div className="pm-display-grid">
          {CHROME_KEYS.map((key) => (
            <label key={key} className="pm-inline-check pm-display-toggle">
              <input
                type="checkbox"
                checked={pageDisplay[key].enabled}
                onChange={(e) => patchDisplay(key, e.target.checked)}
              />
              {PRODUCT_PAGE_ELEMENT_LABELS[key]}
            </label>
          ))}
          <label className="pm-inline-check pm-display-toggle">
            <input
              type="checkbox"
              checked={pageDisplay.tabs.enabled}
              onChange={(e) => patchDisplay("tabs", e.target.checked)}
            />
            {PRODUCT_PAGE_ELEMENT_LABELS.tabs}
          </label>
          {TAB_KEYS.map((key) => (
            <label key={key} className="pm-inline-check pm-display-toggle">
              <input
                type="checkbox"
                checked={pageDisplay[key].enabled}
                onChange={(e) => patchDisplay(key, e.target.checked)}
              />
              {PRODUCT_PAGE_ELEMENT_LABELS[key]}
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset className="apm-fieldset apm-pe-chrome">
        <legend className="apm-fieldset__legend">Compact side view (on scroll)</legend>
        <p className="apm-fieldset__hint">
          When shoppers scroll past the buy column on desktop, shrink it to a compact layout. Choose which elements stay
          visible in that state.
        </p>
        <div className="pm-cta-grid">
          <label className="pm-inline-check pm-display-toggle">
            <input
              type="checkbox"
              checked={compactDisplay.enabled}
              onChange={(e) => {
                setCompactDisplay({ ...compactDisplay, enabled: e.target.checked });
                onDirty?.();
              }}
            />
            Shrink buy column while scrolling
          </label>
          <label className="pm-cta-field">
            <span>Scroll offset (px)</span>
            <input
              type="number"
              min={0}
              max={500}
              value={compactDisplay.scrollOffsetPx}
              onChange={(e) => {
                setCompactDisplay({
                  ...compactDisplay,
                  scrollOffsetPx: Math.max(0, Math.min(500, Number(e.target.value) || 0)),
                });
                onDirty?.();
              }}
            />
          </label>
        </div>
        <div className="pm-display-grid">
          {PRODUCT_PAGE_COMPACT_ELEMENT_KEYS.map((key) => (
            <label key={key} className="pm-inline-check pm-display-toggle">
              <input
                type="checkbox"
                checked={compactDisplay.elements[key]}
                disabled={key === "title"}
                onChange={(e) => patchCompactElement(key, e.target.checked)}
              />
              {PRODUCT_PAGE_COMPACT_ELEMENT_LABELS[key]}
            </label>
          ))}
        </div>
      </fieldset>
    </div>
  );
}
