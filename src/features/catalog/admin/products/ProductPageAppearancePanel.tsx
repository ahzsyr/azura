import type { Dispatch, SetStateAction } from "react";
import type { CSSProperties } from "react";
import type { ResolvedProductPageLayout } from "@/features/products/lib/product-storefront-layout";
import { productPageLayoutCssVars } from "@/features/products/lib/product-storefront-layout";
import { ProductPageLayoutFields } from "./ProductPageLayoutFields";

function ProductPageMiniPreview({ layout }: { layout: ResolvedProductPageLayout }) {
  const vars = productPageLayoutCssVars(layout);
  return (
    <div
      className="apm-mini-pp"
      style={vars as CSSProperties}
      data-prd-gallery={layout.galleryLayout}
      data-prd-media={layout.mediaPosition}
    >
      <div className="apm-mini-pp__hero">
        <div className="apm-mini-pp__gal" />
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
  pageLayout,
  setPageLayout,
  onDirty,
}: {
  pageLayout: ResolvedProductPageLayout;
  setPageLayout: Dispatch<SetStateAction<ResolvedProductPageLayout>>;
  onDirty?: () => void;
}) {
  return (
    <section className="apm-dashboard-card apm-products-settings" aria-labelledby="apm-page-app-h">
      <header className="apm-dashboard-card__head">
        <h2 id="apm-page-app-h" className="apm-dashboard-card__title">
          Product page layout
        </h2>
        <p className="apm-dashboard-card__lede">
          Gallery, media position, and motion for the product detail template. Writes <code>productPageLayout</code>.
          Buy Now and Quote styling live on their own tabs. Save from the top bar.
        </p>
      </header>
      <div className="apm-split">
        <div className="apm-split__main">
          <ProductPageLayoutFields
            value={pageLayout}
            onChange={(next) => {
              setPageLayout(next);
              onDirty?.();
            }}
          />
        </div>
        <aside className="apm-split__aside">
          <div className="apm-preview-cap">Layout wireframe</div>
          <ProductPageMiniPreview layout={pageLayout} />
        </aside>
      </div>
    </section>
  );
}
