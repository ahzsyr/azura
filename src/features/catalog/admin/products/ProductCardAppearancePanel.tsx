import type { Dispatch, SetStateAction } from "react";
import type { CSSProperties } from "react";
import type { ResolvedProductCtaConfig } from "@/features/products/lib/product-cta";
import type { ResolvedProductCardLayout } from "@/features/products/lib/product-storefront-layout";
import { productCardLayoutCssVars } from "@/features/products/lib/product-storefront-layout";
import { ProductCtaAppearanceFields } from "./ProductCtaAppearanceFields";
import { ProductCardLayoutFields } from "./ProductCardLayoutFields";
import { CtaLivePreview } from "./CtaLivePreview";

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
  globalCta,
  setGlobalCta,
  cardLayout,
  setCardLayout,
  busy,
  feedback,
  onSave,
}: {
  globalCta: ResolvedProductCtaConfig;
  setGlobalCta: Dispatch<SetStateAction<ResolvedProductCtaConfig>>;
  cardLayout: ResolvedProductCardLayout;
  setCardLayout: Dispatch<SetStateAction<ResolvedProductCardLayout>>;
  busy: boolean;
  feedback: { kind: "ok" | "err"; text: string } | null;
  onSave: () => void;
}) {
  return (
    <section className="apm-dashboard-card" aria-labelledby="apm-card-app-h">
      <header className="apm-dashboard-card__head">
        <h2 id="apm-card-app-h" className="apm-dashboard-card__title">
          Advanced — product card appearance
        </h2>
        <p className="apm-dashboard-card__lede">
          Storefront cards on the product index, collections, and related rows. Writes <code>productCta.appearance.card</code> and{" "}
          <code>productCardLayout</code>.
        </p>
      </header>
      <div className="apm-split">
        <div className="apm-split__main">
          <details className="apm-details" open>
            <summary>Card chrome</summary>
            <ProductCardLayoutFields value={cardLayout} onChange={setCardLayout} />
          </details>
          <details className="apm-details" open>
            <summary>CTA chip — card context</summary>
            <p className="apm-fieldset__hint">Pinned chip, overlay, and inline modes respect these tokens together with the CTA variant on the general tab.</p>
            <ProductCtaAppearanceFields
              context="card"
              value={globalCta.appearance.card}
              onChange={(next) =>
                setGlobalCta((c) => ({
                  ...c,
                  appearance: { ...c.appearance, card: next },
                }))
              }
            />
          </details>
          <div className="pm-cta-actions apm-save-bar">
            <button type="button" disabled={busy} onClick={onSave}>
              {busy ? "Saving…" : "Save product card appearance"}
            </button>
            {feedback ? (
              <p className={feedback.kind === "ok" ? "pm-cta-actions__ok" : "pm-cta-actions__err"}>{feedback.text}</p>
            ) : null}
          </div>
        </div>
        <aside className="apm-split__aside">
          <div className="apm-preview-cap">Card wireframe</div>
          <ProductCardMiniPreview layout={cardLayout} />
          <div className="apm-preview-cap" style={{ marginTop: "0.75rem" }}>
            CTA preview
          </div>
          <CtaLivePreview cfg={globalCta} />
        </aside>
      </div>
    </section>
  );
}
