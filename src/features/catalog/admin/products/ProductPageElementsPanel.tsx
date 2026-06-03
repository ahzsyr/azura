import type {
  ResolvedProductAddToCart,
  ResolvedProductPageDisplay,
  ResolvedProductPageElementOrder,
  ResolvedProductPromo,
  ResolvedProductTrust,
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
import { ProductPageBlockConfigCard } from "./ProductPageBlockConfigCard";

type Feedback = { kind: "ok" | "err"; text: string } | null;

type Props = {
  pageDisplay: ResolvedProductPageDisplay;
  setPageDisplay: (v: ResolvedProductPageDisplay) => void;
  elementOrder: ResolvedProductPageElementOrder;
  setElementOrder: (v: ResolvedProductPageElementOrder) => void;
  addToCart: ResolvedProductAddToCart;
  setAddToCart: (v: ResolvedProductAddToCart) => void;
  promo: ResolvedProductPromo;
  setPromo: (v: ResolvedProductPromo) => void;
  trust: ResolvedProductTrust;
  setTrust: (v: ResolvedProductTrust) => void;
  compactDisplay: ResolvedProductPageCompactDisplay;
  setCompactDisplay: (v: ResolvedProductPageCompactDisplay) => void;
  feedback?: Feedback;
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
  addToCart,
  setAddToCart,
  promo,
  setPromo,
  trust,
  setTrust,
  compactDisplay,
  setCompactDisplay,
  feedback,
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
    <div className="apm-tab-panel apm-pe-panel">
      <header className="apm-dash-intro">
        <h2 className="apm-dash-intro__title">Product page elements</h2>
        <p className="apm-dash-intro__sub">
          Reorder and toggle blocks on the product detail page. Configure default promo, trust, and add-to-cart
          behavior. Per-product visibility overrides live in each product&apos;s Page Display editor. Save from the
          top bar.
        </p>
      </header>

      {feedback ? (
        <p className={feedback.kind === "ok" ? "pm-cta-actions__ok" : "pm-cta-actions__err"} role="status">
          {feedback.text}
        </p>
      ) : null}

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
          When shoppers scroll past the buy column on desktop, shrink it to a compact layout. Choose which
          elements stay visible in that state.
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

      <div className="apm-pe-blocks">
        <ProductPageBlockConfigCard
          title="Default add to cart"
          enabled={addToCart.enabled}
          onEnabledChange={(enabled) => {
            setAddToCart({ ...addToCart, enabled });
            onDirty?.();
          }}
          preview={
            <button
              type="button"
              className={`apm-pe-cart-preview prd-purchase__add-cart${addToCart.variant === "outline" ? " prd-purchase__add-cart--outline" : ""}${addToCart.size === "lg" ? " prd-purchase__add-cart--lg" : ""}${addToCart.fullWidth ? " prd-purchase__add-cart--full" : ""}`}
            >
              {addToCart.label || "Add to Cart"}
            </button>
          }
        >
          <div className="pm-cta-grid">
            <label className="pm-cta-field">
              <span>Label</span>
              <input
                value={addToCart.label}
                onChange={(e) => {
                  setAddToCart({ ...addToCart, label: e.target.value });
                  onDirty?.();
                }}
              />
            </label>
            <label className="pm-cta-field">
              <span>Link (path or URL)</span>
              <input
                value={addToCart.href}
                onChange={(e) => {
                  setAddToCart({ ...addToCart, href: e.target.value });
                  onDirty?.();
                }}
              />
            </label>
            <label className="pm-cta-field">
              <span>Behavior</span>
              <select
                value={addToCart.behavior}
                onChange={(e) => {
                  setAddToCart({
                    ...addToCart,
                    behavior: e.target.value as ResolvedProductAddToCart["behavior"],
                  });
                  onDirty?.();
                }}
              >
                <option value="stub">Stub message</option>
                <option value="link">Navigate to link</option>
              </select>
            </label>
            <label className="pm-cta-field">
              <span>Variant</span>
              <select
                value={addToCart.variant}
                onChange={(e) => {
                  setAddToCart({
                    ...addToCart,
                    variant: e.target.value as ResolvedProductAddToCart["variant"],
                  });
                  onDirty?.();
                }}
              >
                <option value="primary">Primary</option>
                <option value="outline">Outline</option>
              </select>
            </label>
            <label className="pm-cta-field">
              <span>Size</span>
              <select
                value={addToCart.size}
                onChange={(e) => {
                  setAddToCart({
                    ...addToCart,
                    size: e.target.value as ResolvedProductAddToCart["size"],
                  });
                  onDirty?.();
                }}
              >
                <option value="md">Medium</option>
                <option value="lg">Large</option>
              </select>
            </label>
            <label className="pm-inline-check pm-cta-field">
              <input
                type="checkbox"
                checked={addToCart.openInNewTab}
                onChange={(e) => {
                  setAddToCart({ ...addToCart, openInNewTab: e.target.checked });
                  onDirty?.();
                }}
              />
              Open link in new tab
            </label>
            <label className="pm-inline-check pm-cta-field">
              <input
                type="checkbox"
                checked={addToCart.fullWidth}
                onChange={(e) => {
                  setAddToCart({ ...addToCart, fullWidth: e.target.checked });
                  onDirty?.();
                }}
              />
              Full width button
            </label>
          </div>
        </ProductPageBlockConfigCard>

        <ProductPageBlockConfigCard
          title="Default promo banner"
          enabled={promo.enabled}
          onEnabledChange={(enabled) => {
            setPromo({ ...promo, enabled });
            onDirty?.();
          }}
          preview={
            <div className="apm-pe-promo-preview">
              {promo.eyebrow ? <span className="apm-pe-promo-preview__eyebrow">{promo.eyebrow}</span> : null}
              <strong>{promo.title || "Promo title"}</strong>
              {promo.ctaLabel ? <span className="apm-pe-promo-preview__cta">{promo.ctaLabel}</span> : null}
            </div>
          }
        >
          <div className="pm-cta-grid">
            <label className="pm-cta-field">
              <span>Eyebrow</span>
              <input
                value={promo.eyebrow}
                onChange={(e) => {
                  setPromo({ ...promo, eyebrow: e.target.value });
                  onDirty?.();
                }}
              />
            </label>
            <label className="pm-cta-field">
              <span>Title</span>
              <input
                value={promo.title}
                onChange={(e) => {
                  setPromo({ ...promo, title: e.target.value });
                  onDirty?.();
                }}
              />
            </label>
            <label className="pm-cta-field pm-cta-field--wide">
              <span>Subtitle</span>
              <textarea
                value={promo.subtitle}
                rows={2}
                onChange={(e) => {
                  setPromo({ ...promo, subtitle: e.target.value });
                  onDirty?.();
                }}
              />
            </label>
            <label className="pm-cta-field">
              <span>CTA label</span>
              <input
                value={promo.ctaLabel}
                onChange={(e) => {
                  setPromo({ ...promo, ctaLabel: e.target.value });
                  onDirty?.();
                }}
              />
            </label>
            <label className="pm-cta-field">
              <span>CTA href</span>
              <input
                value={promo.ctaHref}
                onChange={(e) => {
                  setPromo({ ...promo, ctaHref: e.target.value });
                  onDirty?.();
                }}
              />
            </label>
            <label className="pm-inline-check pm-cta-field">
              <input
                type="checkbox"
                checked={promo.openInNewTab}
                onChange={(e) => {
                  setPromo({ ...promo, openInNewTab: e.target.checked });
                  onDirty?.();
                }}
              />
              Open CTA in new tab
            </label>
          </div>
        </ProductPageBlockConfigCard>

        <ProductPageBlockConfigCard
          title="Default trust widget"
          enabled={trust.enabled}
          onEnabledChange={(enabled) => {
            setTrust({ ...trust, enabled });
            onDirty?.();
          }}
          preview={
            <div className="apm-pe-trust-preview">
              <span>{trust.provider}</span>
              <strong>{trust.label}</strong>
              <span>{trust.rating.toFixed(1)} ★</span>
            </div>
          }
        >
          <div className="pm-cta-grid">
            <label className="pm-cta-field">
              <span>Provider name</span>
              <input
                value={trust.provider}
                onChange={(e) => {
                  setTrust({ ...trust, provider: e.target.value });
                  onDirty?.();
                }}
              />
            </label>
            <label className="pm-cta-field">
              <span>Label</span>
              <input
                value={trust.label}
                onChange={(e) => {
                  setTrust({ ...trust, label: e.target.value });
                  onDirty?.();
                }}
              />
            </label>
            <label className="pm-cta-field">
              <span>Default rating</span>
              <input
                type="number"
                min={0}
                max={5}
                step={0.1}
                value={trust.rating}
                onChange={(e) => {
                  setTrust({ ...trust, rating: Number(e.target.value) });
                  onDirty?.();
                }}
              />
            </label>
            <label className="pm-cta-field">
              <span>Review count</span>
              <input
                type="number"
                min={0}
                step={1}
                value={trust.reviewCount}
                onChange={(e) => {
                  setTrust({ ...trust, reviewCount: Number(e.target.value) });
                  onDirty?.();
                }}
              />
            </label>
            <label className="pm-cta-field">
              <span>Link (optional)</span>
              <input
                value={trust.href}
                onChange={(e) => {
                  setTrust({ ...trust, href: e.target.value });
                  onDirty?.();
                }}
              />
            </label>
          </div>
        </ProductPageBlockConfigCard>
      </div>
    </div>
  );
}
