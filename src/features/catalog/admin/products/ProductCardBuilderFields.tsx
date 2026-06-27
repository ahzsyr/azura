"use client";

import type { ResolvedProductCardDesign } from "@/features/products/card-design/product-card-design.types";
import type { ProductCardContentSlot } from "@/features/products/card-design/product-card-design.types";
import { DEFAULT_CONTENT_ORDER } from "@/features/products/card-design/product-card-design.types";
import { ProductCardLayoutFields } from "./ProductCardLayoutFields";
import { ProductCardPresetChips } from "./ProductCardPresetChips";
import { applyProductCardPreset } from "@/features/products/card-design/product-card-presets";

const CONTENT_SLOT_LABELS: Record<ProductCardContentSlot, string> = {
  brand: "Brand",
  category: "Category",
  title: "Title",
  badges: "Badges",
  description: "Short description",
  features: "Feature tags",
  price: "Price",
  rating: "Rating",
  stock: "Stock",
  actions: "Actions",
};

type BuilderTab = "layout" | "style" | "content" | "motion" | "actions" | "responsive" | "presets";

export function ProductCardBuilderFields({
  design,
  cardLayout,
  setDesign,
  setCardLayout,
  onDirty,
  activeTab,
  onTabChange,
}: {
  design: ResolvedProductCardDesign;
  cardLayout: import("@/features/products/lib/product-storefront-layout").ResolvedProductCardLayout;
  setDesign: (next: ResolvedProductCardDesign) => void;
  setCardLayout: (next: import("@/features/products/lib/product-storefront-layout").ResolvedProductCardLayout) => void;
  onDirty?: () => void;
  activeTab: BuilderTab;
  onTabChange: (tab: BuilderTab) => void;
}) {
  const tabs: { id: BuilderTab; label: string }[] = [
    { id: "presets", label: "Presets" },
    { id: "layout", label: "Layout" },
    { id: "style", label: "Style" },
    { id: "content", label: "Content" },
    { id: "motion", label: "Motion" },
    { id: "actions", label: "Actions" },
    { id: "responsive", label: "Responsive" },
  ];

  const patchDesign = (partial: Partial<ResolvedProductCardDesign>) => {
    setDesign({ ...design, ...partial });
    onDirty?.();
  };

  const moveContentSlot = (index: number, direction: -1 | 1) => {
    const order = [...design.contentOrder];
    const target = index + direction;
    if (target < 0 || target >= order.length) return;
    [order[index], order[target]] = [order[target], order[index]];
    patchDesign({ contentOrder: order });
  };

  return (
    <div className="apm-card-builder">
      <nav className="apm-card-builder__tabs" aria-label="Card builder sections">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            className={`apm-card-builder__tab${activeTab === t.id ? " is-active" : ""}`}
            onClick={() => onTabChange(t.id)}
          >
            {t.label}
          </button>
        ))}
      </nav>

      {activeTab === "presets" ? (
        <ProductCardPresetChips
          activePreset={design.presetId}
          onApply={(presetId) => {
            const merged = applyProductCardPreset(presetId, design);
            setDesign({
              ...design,
              ...merged,
              presetId,
              style: presetId,
            } as ResolvedProductCardDesign);
            onDirty?.();
          }}
        />
      ) : null}

      {activeTab === "layout" ? (
        <fieldset className="apm-fieldset">
          <legend className="apm-fieldset__legend">Layout mode</legend>
          <select
            value={design.layout}
            onChange={(e) =>
              patchDesign({
                layout: e.target.value as ResolvedProductCardDesign["layout"],
              })
            }
          >
            <option value="classic_grid">Classic grid</option>
            <option value="compact_store">Compact store</option>
            <option value="marketplace">Marketplace</option>
            <option value="luxury_showcase">Luxury showcase</option>
            <option value="editorial">Editorial</option>
            <option value="horizontal">Horizontal</option>
            <option value="floating">Floating</option>
            <option value="split">Split</option>
            <option value="masonry">Masonry</option>
            <option value="adaptive">Adaptive</option>
          </select>
        </fieldset>
      ) : null}

      {activeTab === "style" ? (
        <>
          <fieldset className="apm-fieldset">
            <legend className="apm-fieldset__legend">Style preset</legend>
            <select
              value={design.style}
              onChange={(e) =>
                patchDesign({ style: e.target.value as ResolvedProductCardDesign["style"] })
              }
            >
              <option value="modern_commerce">Modern commerce</option>
              <option value="minimal">Minimal</option>
              <option value="luxury">Luxury</option>
              <option value="glass">Glass</option>
              <option value="editorial">Editorial</option>
              <option value="dark_premium">Dark premium</option>
              <option value="neon_tech">Neon tech</option>
            </select>
          </fieldset>
          <fieldset className="apm-fieldset">
            <legend className="apm-fieldset__legend">Pricing display</legend>
            <select
              value={design.pricingMode}
              onChange={(e) =>
                patchDesign({
                  pricingMode: e.target.value as ResolvedProductCardDesign["pricingMode"],
                })
              }
            >
              <option value="minimal">Minimal</option>
              <option value="retail">Retail</option>
              <option value="marketplace">Marketplace</option>
              <option value="luxury">Luxury</option>
              <option value="enterprise">Enterprise</option>
            </select>
          </fieldset>
          <label className="pm-inline-check">
            <input
              type="checkbox"
              checked={design.effects.enabled}
              onChange={(e) =>
                patchDesign({ effects: { ...design.effects, enabled: e.target.checked } })
              }
            />
            Enable premium effects layer
          </label>
        </>
      ) : null}

      {activeTab === "content" ? (
        <>
          <label className="pm-inline-check">
            <input
              type="checkbox"
              checked={design.showCategory}
              onChange={(e) => patchDesign({ showCategory: e.target.checked })}
            />
            Show category line
          </label>
          <fieldset className="apm-fieldset">
            <legend className="apm-fieldset__legend">Content order</legend>
            <ul className="apm-order-list">
              {design.contentOrder.map((slot, index) => (
                <li key={slot} className="apm-order-list__item">
                  <span>{CONTENT_SLOT_LABELS[slot] ?? slot}</span>
                  <span className="apm-order-list__actions">
                    <button type="button" onClick={() => moveContentSlot(index, -1)} aria-label="Move up">
                      ↑
                    </button>
                    <button type="button" onClick={() => moveContentSlot(index, 1)} aria-label="Move down">
                      ↓
                    </button>
                  </span>
                </li>
              ))}
            </ul>
            <button
              type="button"
              className="apm-btn-ghost"
              onClick={() => patchDesign({ contentOrder: [...DEFAULT_CONTENT_ORDER] })}
            >
              Reset order
            </button>
          </fieldset>
        </>
      ) : null}

      {activeTab === "motion" ? (
        <>
          <fieldset className="apm-fieldset">
            <legend className="apm-fieldset__legend">Motion preset</legend>
            <select
              value={design.motion}
              onChange={(e) =>
                patchDesign({ motion: e.target.value as ResolvedProductCardDesign["motion"] })
              }
            >
              <option value="subtle">Subtle</option>
              <option value="premium">Premium</option>
              <option value="interactive">Interactive</option>
              <option value="luxury">Luxury</option>
              <option value="disabled">Disabled</option>
            </select>
          </fieldset>
          <fieldset className="apm-fieldset">
            <legend className="apm-fieldset__legend">Hover effect</legend>
            <select
              value={design.hoverEffect}
              onChange={(e) =>
                patchDesign({
                  hoverEffect: e.target.value as ResolvedProductCardDesign["hoverEffect"],
                })
              }
            >
              <option value="lift">Lift</option>
              <option value="glow">Glow</option>
              <option value="scale_image">Scale image</option>
              <option value="tilt">Tilt</option>
              <option value="spotlight">Spotlight</option>
              <option value="reveal">Reveal</option>
              <option value="depth">Depth</option>
              <option value="cinematic">Cinematic</option>
              <option value="liquid">Liquid</option>
              <option value="none">None</option>
            </select>
          </fieldset>
        </>
      ) : null}

      {activeTab === "actions" ? (
        <fieldset className="apm-fieldset">
          <legend className="apm-fieldset__legend">Enabled card actions</legend>
          {(
            ["buy_now", "quote", "wishlist", "compare", "quick_view"] as const
          ).map((type) => (
            <label key={type} className="pm-inline-check">
              <input
                type="checkbox"
                checked={design.actions.enabledTypes.includes(type)}
                onChange={(e) => {
                  const set = new Set(design.actions.enabledTypes);
                  if (e.target.checked) set.add(type);
                  else set.delete(type);
                  patchDesign({
                    actions: { ...design.actions, enabledTypes: [...set] },
                  });
                }}
              />
              {type.replace("_", " ")}
            </label>
          ))}
        </fieldset>
      ) : null}

      {activeTab === "responsive" ? (
        <p className="apm-fieldset__hint">
          Per-breakpoint overrides are stored in <code>productCardDesignResponsive</code>. Use the
          preview device toggle to validate layout at mobile widths. Desktop overrides inherit from
          the settings above.
        </p>
      ) : null}

      <div className="mt-6">
        <ProductCardLayoutFields
          value={cardLayout}
          onChange={(next) => {
            setCardLayout(next);
            onDirty?.();
          }}
        />
      </div>
    </div>
  );
}

export type { BuilderTab };
