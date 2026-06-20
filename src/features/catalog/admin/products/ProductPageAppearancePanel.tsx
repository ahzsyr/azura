"use client";

import { useState } from "react";
import type { CSSProperties } from "react";
import type { ResolvedProductPageLayout } from "@/features/products/lib/product-storefront-layout";
import { productPageLayoutCssVars } from "@/features/products/lib/product-storefront-layout";
import type {
  ProductPageLayoutRules,
  ProductPageViewport,
} from "@/features/products/lib/product-page-responsive";
import { resolveLayoutForViewport } from "@/features/products/lib/product-page-responsive";
import { AdminViewportToggle, viewportInheritHint } from "./AdminViewportToggle";
import { ProductPageLayoutFields } from "./ProductPageLayoutFields";
import { ProductPageOverflowFields } from "./ProductPageOverflowFields";
import type { ResolvedProductPageOverflow } from "@/features/products/lib/product-page-overflow";

function ProductPageMiniPreview({ layout }: { layout: ResolvedProductPageLayout }) {
  const vars = productPageLayoutCssVars(layout);
  const thumbs = layout.galleryThumbPlacement;
  return (
    <div
      className="apm-mini-pp"
      style={vars as CSSProperties}
      data-prd-gallery={layout.galleryLayout}
      data-prd-media={layout.mediaPosition}
      data-prd-gallery-thumbs={thumbs}
    >
      <div className="apm-mini-pp__hero">
        <div className={`apm-mini-pp__gal-stage apm-mini-pp__gal-stage--${thumbs}`}>
          {thumbs === "left" ? <div className="apm-mini-pp__gal-thumbs" aria-hidden /> : null}
          <div className="apm-mini-pp__gal" />
          {thumbs === "right" ? <div className="apm-mini-pp__gal-thumbs" aria-hidden /> : null}
          {thumbs === "below" ? <div className="apm-mini-pp__gal-thumbs apm-mini-pp__gal-thumbs--below" aria-hidden /> : null}
        </div>
        <div className="apm-mini-pp__buy">
          <div className="apm-mini-pp__line" />
          <div className="apm-mini-pp__line apm-mini-pp__line--short" />
          <div className="apm-mini-pp__btn" />
        </div>
      </div>
      <div className="apm-mini-pp__tabs" aria-hidden>
        <span />
        <span />
        <span />
      </div>
    </div>
  );
}

export function ProductPageAppearancePanel({
  layoutRules,
  setLayoutRules,
  overflow,
  setOverflow,
  onDirty,
}: {
  layoutRules: ProductPageLayoutRules;
  setLayoutRules: (next: ProductPageLayoutRules) => void;
  overflow: ResolvedProductPageOverflow;
  setOverflow: (next: ResolvedProductPageOverflow) => void;
  onDirty?: () => void;
}) {
  const [viewport, setViewport] = useState<ProductPageViewport>("desktop");
  const activeLayout = resolveLayoutForViewport(layoutRules, viewport);

  return (
    <section className="apm-dashboard-card apm-products-settings" aria-labelledby="apm-page-app-h">
      <header className="apm-dashboard-card__head">
        <h2 id="apm-page-app-h" className="apm-dashboard-card__title">
          Product page layout
        </h2>
        <p className="apm-dashboard-card__lede">
          Gallery, media position, and motion for the product detail template per viewport. Writes{" "}
          <code>productPageLayout</code> and <code>productPageLayoutResponsive</code>. Buy Now and Quote styling live on
          their own tabs. Save from the top bar.
        </p>
      </header>

      <AdminViewportToggle
        value={viewport}
        onChange={setViewport}
        inheritHint={viewportInheritHint(viewport)}
      />

      <div className="apm-split">
        <div className="apm-split__main">
          <ProductPageLayoutFields
            viewport={viewport}
            value={activeLayout}
            onChange={(next) => {
              setLayoutRules({ ...layoutRules, [viewport]: next });
              onDirty?.();
            }}
          />
          <ProductPageOverflowFields
            value={overflow}
            onChange={(next) => {
              setOverflow(next);
              onDirty?.();
            }}
          />
        </div>
        <aside className="apm-split__aside">
          <div className="apm-preview-cap">Layout wireframe ({viewport})</div>
          <ProductPageMiniPreview layout={activeLayout} />
        </aside>
      </div>
    </section>
  );
}
