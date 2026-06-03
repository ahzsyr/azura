import type { Dispatch, SetStateAction } from "react";
import type { CSSProperties } from "react";
import type { ResolvedProductCtaConfig } from "@/features/products/lib/product-cta";
import type { ResolvedProductPageLayout } from "@/features/products/lib/product-storefront-layout";
import { productPageLayoutCssVars } from "@/features/products/lib/product-storefront-layout";
import { ProductCtaAppearanceFields } from "./ProductCtaAppearanceFields";
import { ProductPageLayoutFields } from "./ProductPageLayoutFields";
import { CtaLivePreview } from "./CtaLivePreview";

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
  globalCta,
  setGlobalCta,
  pageLayout,
  setPageLayout,
  busy,
  feedback,
  onSave,
}: {
  globalCta: ResolvedProductCtaConfig;
  setGlobalCta: Dispatch<SetStateAction<ResolvedProductCtaConfig>>;
  pageLayout: ResolvedProductPageLayout;
  setPageLayout: Dispatch<SetStateAction<ResolvedProductPageLayout>>;
  busy: boolean;
  feedback: { kind: "ok" | "err"; text: string } | null;
  onSave: () => void;
}) {
  return (
    <section className="apm-dashboard-card" aria-labelledby="apm-page-app-h">
      <header className="apm-dashboard-card__head">
        <h2 id="apm-page-app-h" className="apm-dashboard-card__title">
          Advanced — product page appearance
        </h2>
        <p className="apm-dashboard-card__lede">
          Tune the product detail template and the inline / sticky CTA chrome. This writes <code>productCta.appearance.page</code> and{" "}
          <code>productPageLayout</code> in site settings.
        </p>
      </header>
      <div className="apm-split">
        <div className="apm-split__main">
          <details className="apm-details" open>
            <summary>Layout &amp; motion</summary>
            <ProductPageLayoutFields value={pageLayout} onChange={setPageLayout} />
          </details>
          <details className="apm-details" open>
            <summary>CTA button — product page context</summary>
            <p className="apm-fieldset__hint">
              These fields map to the merged appearance for the detail page. Values identical to the built-in default are omitted from JSON.
            </p>
            <ProductCtaAppearanceFields
              context="page"
              value={globalCta.appearance.page}
              onChange={(next) =>
                setGlobalCta((c) => ({
                  ...c,
                  appearance: { ...c.appearance, page: next },
                }))
              }
            />
          </details>
          <div className="pm-cta-actions apm-save-bar">
            <button type="button" disabled={busy} onClick={onSave}>
              {busy ? "Saving…" : "Save product page appearance"}
            </button>
            {feedback ? (
              <p className={feedback.kind === "ok" ? "pm-cta-actions__ok" : "pm-cta-actions__err"}>{feedback.text}</p>
            ) : null}
          </div>
        </div>
        <aside className="apm-split__aside">
          <div className="apm-preview-cap">Layout wireframe</div>
          <ProductPageMiniPreview layout={pageLayout} />
          <div className="apm-preview-cap" style={{ marginTop: "0.75rem" }}>
            CTA preview
          </div>
          <CtaLivePreview cfg={globalCta} />
        </aside>
      </div>
    </section>
  );
}
