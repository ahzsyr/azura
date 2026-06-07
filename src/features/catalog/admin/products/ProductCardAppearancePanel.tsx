import type { Dispatch, SetStateAction } from "react";
import type { CSSProperties } from "react";
import type { ResolvedProductCardLayout } from "@/features/products/lib/product-storefront-layout";
import { productCardLayoutCssVars } from "@/features/products/lib/product-storefront-layout";
import { ProductCardLayoutFields } from "./ProductCardLayoutFields";

function ProductCardMiniPreview({ layout }: { layout: ResolvedProductCardLayout }) {
  const vars = productCardLayoutCssVars(layout);
  return (
    <div
      className="apm-mini-card"
      style={vars as CSSProperties}
      data-prd-card-hover={layout.hoverBehavior}
      data-prd-card-ratio={layout.imageAspectRatio}
    >
      <div className="apm-mini-card__media" />
      <div className="apm-mini-card__body">
        <div className="apm-mini-card__t" />
        <div className="apm-mini-card__p" />
      </div>
    </div>
  );
}

export function ProductCardAppearancePanel({
  cardLayout,
  setCardLayout,
  onDirty,
}: {
  cardLayout: ResolvedProductCardLayout;
  setCardLayout: Dispatch<SetStateAction<ResolvedProductCardLayout>>;
  onDirty?: () => void;
}) {
  return (
    <section className="apm-dashboard-card apm-products-settings" aria-labelledby="apm-card-app-h">
      <header className="apm-dashboard-card__head">
        <h2 id="apm-card-app-h" className="apm-dashboard-card__title">
          Product card appearance
        </h2>
        <p className="apm-dashboard-card__lede">
          Storefront cards on the product index, collections, and related rows. Writes <code>productCardLayout</code>{" "}
          only. Quote CTA styling is on the Get Quote CTA tab. Save from the top bar.
        </p>
      </header>
      <div className="apm-split">
        <div className="apm-split__main">
          <ProductCardLayoutFields
            value={cardLayout}
            onChange={(next) => {
              setCardLayout(next);
              onDirty?.();
            }}
          />
        </div>
        <aside className="apm-split__aside">
          <div className="apm-preview-cap">Card wireframe</div>
          <ProductCardMiniPreview layout={cardLayout} />
        </aside>
      </div>
    </section>
  );
}
