"use client";

import { useState } from "react";
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
import type {
  ProductPageElementsRules,
  ProductPageViewport,
} from "@/features/products/lib/product-page-responsive";
import { ProductPageElementOrderList } from "./ProductPageElementOrderList";

type Props = {
  elementsRules: ProductPageElementsRules;
  setElementsRules: (v: ProductPageElementsRules) => void;
  onDirty?: () => void;
};

const VIEWPORTS = ["desktop", "tablet", "mobile"] as const satisfies readonly ProductPageViewport[];

const TAB_KEYS = [
  "tabDescription",
  "tabSpecs",
  "tabDocuments",
  "tabShipping",
  "tabReviews",
] as const;

type DisplayKey = keyof ResolvedProductPageDisplay;
type PageElementsSectionTab = "matrix" | "main" | "side" | "compact";

const SECTION_TABS: Array<{ id: PageElementsSectionTab; label: string }> = [
  { id: "matrix", label: "Elements visibility matrix" },
  { id: "main", label: "Product page main" },
  { id: "side", label: "Product page side" },
  { id: "compact", label: "Compact side view (on scroll)" },
];

const ELEMENT_MATRIX_SECTIONS: Array<{
  title: string;
  keys: readonly DisplayKey[];
}> = [
  {
    title: "Page structure",
    keys: ["breadcrumb", "gallery", "sideBuyBox", "tabs", "floatingCta"],
  },
  {
    title: "Buy box",
    keys: [
      "price",
      "stock",
      "condition",
      "delivery",
      "quantity",
      "buyNow",
      "keySpecs",
    ],
  },
  {
    title: "Product information",
    keys: ["shortDescription", "linkedTags", "inlineCta", "variations", "compare", "saveToList"],
  },
  {
    title: "Tabs",
    keys: TAB_KEYS,
  },
  {
    title: "Merchandising",
    keys: ["frequentlyBought", "crossLinks", "promo", "servicesBar", "trust"],
  },
];

export function ProductPageElementsPanel({
  elementsRules,
  setElementsRules,
  onDirty,
}: Props) {
  const [sectionTab, setSectionTab] = useState<PageElementsSectionTab>("matrix");
  const layer = elementsRules.desktop;
  const desktopLayer = elementsRules.desktop;

  const patchLayer = (next: typeof layer) => {
    setElementsRules({ ...elementsRules, desktop: next });
    onDirty?.();
  };

  const patchViewportLayer = (
    targetViewport: ProductPageViewport,
    next: ProductPageElementsRules[ProductPageViewport],
  ) => {
    setElementsRules({ ...elementsRules, [targetViewport]: next });
    onDirty?.();
  };

  const patchDisplayFlags = (
    display: ResolvedProductPageDisplay,
    key: keyof ResolvedProductPageDisplay,
    enabled: boolean,
  ): ResolvedProductPageDisplay => {
    const next = { ...display, [key]: { enabled } };
    if (key === "buyNow" || key === "addToCart") {
      return { ...next, buyNow: { enabled }, addToCart: { enabled } };
    }
    return next;
  };

  const patchDisplay = (key: keyof ResolvedProductPageDisplay, enabled: boolean) => {
    patchLayer({
      ...layer,
      display: patchDisplayFlags(layer.display, key, enabled),
    });
  };

  const patchDisplayForViewport = (
    targetViewport: ProductPageViewport,
    key: keyof ResolvedProductPageDisplay,
    enabled: boolean,
  ) => {
    const targetLayer = elementsRules[targetViewport];
    patchViewportLayer(targetViewport, {
      ...targetLayer,
      display: patchDisplayFlags(targetLayer.display, key, enabled),
    });
  };

  const patchDesktopLayer = (next: typeof desktopLayer) => {
    setElementsRules({ ...elementsRules, desktop: next });
    onDirty?.();
  };

  const patchCompactElement = (key: ProductPageCompactElementKey, enabled: boolean) => {
    const elements = { ...desktopLayer.compactDisplay.elements, [key]: enabled };
    if (key !== "title") elements.title = true;
    const visibleKeys = PRODUCT_PAGE_COMPACT_ELEMENT_KEYS.filter((k) => elements[k]);
    patchDesktopLayer({
      ...desktopLayer,
      compactDisplay: { ...desktopLayer.compactDisplay, elements, visibleKeys },
    });
  };

  return (
    <div className="apm-tab-panel apm-pe-panel apm-products-settings">
      <header className="apm-dash-intro">
        <h2 className="apm-dash-intro__title">Product page elements</h2>
        <p className="apm-dash-intro__sub">
          Reorder and toggle blocks on the product detail page per viewport. Price, stock, compare, short
          description, trust (rating), and buy now also affect product cards in listings and CMS
          blocks. Configure Buy Now, promo, and trust content on their dedicated tabs. Per-product
          visibility overrides live in each product&apos;s Page Display editor. Save from the top
          bar.
        </p>
        <p className="apm-dash-intro__sub apm-dash-intro__sub-link">
          Need per-product overrides? Open any product and use its{" "}
          <strong>Page Display</strong> section.
          {" "}
          <a href="#table">Go to products table</a>
          {" "}
          to edit a specific product.
        </p>
      </header>

      <div className="apm-pe-section-ribbon" role="tablist" aria-label="Page element sections">
        {SECTION_TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={sectionTab === tab.id}
            className={`apm-pe-section-ribbon__btn${sectionTab === tab.id ? " is-active" : ""}`}
            onClick={() => setSectionTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {sectionTab === "matrix" ? (
        <section className="apm-pe-matrix-card" role="tabpanel">
          <header className="apm-pe-zone__head">
            <h3 className="apm-pe-zone__title">Elements visibility matrix</h3>
            <p className="apm-pe-zone__desc">
              Toggle every product page element independently for Desktop, Tablet, and Mobile.
            </p>
          </header>
          <div className="apm-pe-matrix-wrap">
            <table className="apm-pe-matrix">
              <thead>
                <tr>
                  <th scope="col">Elements</th>
                  {VIEWPORTS.map((vp) => (
                    <th key={vp} scope="col">
                      {vp[0].toUpperCase()}
                      {vp.slice(1)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {ELEMENT_MATRIX_SECTIONS.flatMap((section) => [
                  <tr key={`section-${section.title}`} className="apm-pe-matrix__section">
                    <th scope="rowgroup" colSpan={4}>
                      {section.title}
                    </th>
                  </tr>,
                  ...section.keys.map((key) => (
                    <tr key={key}>
                      <th scope="row">
                        <span>{PRODUCT_PAGE_ELEMENT_LABELS[key] ?? key}</span>
                      </th>
                      {VIEWPORTS.map((vp) => {
                        const checked = elementsRules[vp].display[key]?.enabled !== false;
                        return (
                          <td key={`${key}-${vp}`}>
                            <label className="apm-pe-matrix__check">
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={(e) => patchDisplayForViewport(vp, key, e.target.checked)}
                              />
                              <span className="sr-only">
                                Show {PRODUCT_PAGE_ELEMENT_LABELS[key] ?? key} on {vp}
                              </span>
                            </label>
                          </td>
                        );
                      })}
                    </tr>
                  )),
                ])}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      {sectionTab === "main" ? (
        <ProductPageElementOrderList
          title="Product page main"
          description="Scroll column below the gallery area."
          keys={PRODUCT_PAGE_MAIN_ORDER_KEYS}
          order={layer.elementOrder.main}
          display={layer.display}
          onOrderChange={(main) => {
            patchLayer({
              ...layer,
              elementOrder: {
                ...layer.elementOrder,
                main: main as ResolvedProductPageElementOrder["main"],
              },
            });
          }}
          onToggle={patchDisplay}
        />
      ) : null}

      {sectionTab === "side" ? (
        <ProductPageElementOrderList
          title="Product page side"
          description="Buy box column order on desktop."
          keys={PRODUCT_PAGE_SIDE_ORDER_KEYS}
          order={layer.elementOrder.side}
          display={layer.display}
          onOrderChange={(side) => {
            patchLayer({
              ...layer,
              elementOrder: {
                ...layer.elementOrder,
                side: side as ResolvedProductPageElementOrder["side"],
              },
            });
          }}
          onToggle={patchDisplay}
        />
      ) : null}

      {sectionTab === "compact" ? (
        <fieldset className="apm-fieldset apm-pe-chrome" role="tabpanel">
          <legend className="apm-fieldset__legend">Compact side view (on scroll)</legend>
          <p className="apm-fieldset__hint">
            When shoppers scroll past the buy column on desktop, shrink it to a compact layout. Choose which elements stay
            visible in that state.
          </p>
          <div className="pm-cta-grid">
            <label className="pm-inline-check pm-display-toggle">
              <input
                type="checkbox"
                checked={desktopLayer.compactDisplay.enabled}
                onChange={(e) => {
                  patchDesktopLayer({
                    ...desktopLayer,
                    compactDisplay: { ...desktopLayer.compactDisplay, enabled: e.target.checked },
                  });
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
                value={desktopLayer.compactDisplay.scrollOffsetPx}
                onChange={(e) => {
                  patchDesktopLayer({
                    ...desktopLayer,
                    compactDisplay: {
                      ...desktopLayer.compactDisplay,
                      scrollOffsetPx: Math.max(0, Math.min(500, Number(e.target.value) || 0)),
                    },
                  });
                }}
              />
            </label>
          </div>
          <div className="pm-display-grid">
            {PRODUCT_PAGE_COMPACT_ELEMENT_KEYS.map((key) => (
              <label key={key} className="pm-inline-check pm-display-toggle">
                <input
                  type="checkbox"
                  checked={desktopLayer.compactDisplay.elements[key]}
                  disabled={key === "title"}
                  onChange={(e) => patchCompactElement(key, e.target.checked)}
                />
                {PRODUCT_PAGE_COMPACT_ELEMENT_LABELS[key]}
              </label>
            ))}
          </div>
        </fieldset>
      ) : null}
    </div>
  );
}
