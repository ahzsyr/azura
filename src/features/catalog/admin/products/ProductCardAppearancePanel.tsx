"use client";

import { useState, type Dispatch, type SetStateAction } from "react";
import type { ResolvedProductCardLayout } from "@/features/products/lib/product-storefront-layout";
import type { ResolvedProductCardDesign } from "@/features/products/card-design";
import {
  ProductCardBuilderFields,
  type BuilderTab,
} from "./ProductCardBuilderFields";
import { ProductCardLivePreview } from "./ProductCardLivePreview";

export function ProductCardAppearancePanel({
  cardLayout,
  setCardLayout,
  cardDesign,
  setCardDesign,
  onDirty,
}: {
  cardLayout: ResolvedProductCardLayout;
  setCardLayout: Dispatch<SetStateAction<ResolvedProductCardLayout>>;
  cardDesign: ResolvedProductCardDesign;
  setCardDesign: Dispatch<SetStateAction<ResolvedProductCardDesign>>;
  onDirty?: () => void;
}) {
  const [builderTab, setBuilderTab] = useState<BuilderTab>("presets");

  return (
    <section className="apm-dashboard-card apm-products-settings" aria-labelledby="apm-card-app-h">
      <header className="apm-dashboard-card__head">
        <h2 id="apm-card-app-h" className="apm-dashboard-card__title">
          Product card builder
        </h2>
        <p className="apm-dashboard-card__lede">
          Visual configuration for storefront product cards. Saves <code>productCardDesign</code>{" "}
          and syncs legacy <code>productCardLayout</code>. Page element toggles (price, stock,
          compare, trust, buy now) are in the Page builder tab.
        </p>
      </header>
      <div className="apm-split">
        <div className="apm-split__main">
          <ProductCardBuilderFields
            design={cardDesign}
            cardLayout={cardLayout}
            setDesign={setCardDesign}
            setCardLayout={setCardLayout}
            onDirty={onDirty}
            activeTab={builderTab}
            onTabChange={setBuilderTab}
          />
          <section className="apm-fieldset mt-6">
            <h3 className="apm-fieldset__legend">Linked page elements</h3>
            <p className="apm-fieldset__hint">
              Price, stock, compare, short description, trust (rating), and buy now are controlled
              on the Page builder tab.
            </p>
          </section>
        </div>
        <aside className="apm-split__aside">
          <div className="apm-preview-cap">Live card preview</div>
          <ProductCardLivePreview design={cardDesign} cardLayout={cardLayout} />
        </aside>
      </div>
    </section>
  );
}
