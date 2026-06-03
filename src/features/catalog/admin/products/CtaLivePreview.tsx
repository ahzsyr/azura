import type { CSSProperties } from "react";
import {
  productCtaAppearanceToStyle,
  productCtaButtonSizeClass,
  productCtaHoverAnimClass,
  productCtaShadowClass,
  type ProductCtaAppearanceResolved,
  type ProductCtaAlignment,
} from "@/features/products/lib/product-cta-appearance";
import { productCtaCssVariant, type ResolvedProductCtaConfig } from "@/features/products/lib/product-cta";

function ctaBtnWidthStyle(a: ProductCtaAppearanceResolved): CSSProperties {
  if (a.fullWidth) return { width: "100%" };
  const w = a.buttonWidthCss.trim();
  if (w) return { width: w };
  return { width: "auto" };
}

function ctaRowClass(alignment: ProductCtaAlignment): string {
  switch (alignment) {
    case "center":
      return "pm-cta-prev__cta-row pm-cta-prev__cta-row--center";
    case "end":
      return "pm-cta-prev__cta-row pm-cta-prev__cta-row--end";
    case "stretch":
      return "pm-cta-prev__cta-row pm-cta-prev__cta-row--stretch";
    default:
      return "pm-cta-prev__cta-row pm-cta-prev__cta-row--start";
  }
}

function CtaPreviewIcon({ cfg }: { cfg: ResolvedProductCtaConfig }) {
  const url = cfg.iconUrl?.trim();
  if (url) {
    return (
      <img
        src={url}
        alt=""
        className="pm-cta-prev__icon-img"
        style={{ width: "var(--prd-cta-icon-size, 1em)", height: "var(--prd-cta-icon-size, 1em)", objectFit: "contain" }}
      />
    );
  }
  if (cfg.icon) {
    return <i className={cfg.icon} aria-hidden style={{ fontSize: "var(--prd-cta-icon-size, 1em)" }} />;
  }
  return null;
}

export function CtaLivePreview({ cfg }: { cfg: ResolvedProductCtaConfig }) {
  const pageS = productCtaAppearanceToStyle(cfg.appearance.page);
  const cardS = productCtaAppearanceToStyle(cfg.appearance.card);
  const sizeP = productCtaButtonSizeClass(cfg.appearance.page.buttonSize);
  const sizeC = productCtaButtonSizeClass(cfg.appearance.card.buttonSize);
  const shP = productCtaShadowClass(cfg.appearance.page.shadow);
  const shC = productCtaShadowClass(cfg.appearance.card.shadow);
  const hvP = productCtaHoverAnimClass(cfg.appearance.page.hoverAnimation);
  const hvC = productCtaHoverAnimClass(cfg.appearance.card.hoverAnimation);
  const vCls = productCtaCssVariant(cfg.variant);
  const label = cfg.label || "Button";
  const rowDir = (pos: "start" | "end"): "row" | "row-reverse" => (pos === "end" ? "row-reverse" : "row");
  const pageW = ctaBtnWidthStyle(cfg.appearance.page);
  const cardW = ctaBtnWidthStyle(cfg.appearance.card);

  const pageBtnStyle: CSSProperties = {
    ...pageS,
    display: "inline-flex",
    flexDirection: rowDir(cfg.appearance.page.iconPosition),
    alignItems: "center",
    gap: "0.4rem",
    justifyContent: "center",
    ...pageW,
  };

  const cardBtnStyle: CSSProperties = {
    ...cardS,
    display: "inline-flex",
    flexDirection: rowDir(cfg.appearance.card.iconPosition),
    alignItems: "center",
    gap: "0.3rem",
    maxWidth: "100%",
    justifyContent: "center",
    ...cardW,
  };

  const pageInner =
    cfg.appearance.page.iconPosition === "end" ? (
      <>
        <span>{label}</span>
        <CtaPreviewIcon cfg={cfg} />
      </>
    ) : (
      <>
        <CtaPreviewIcon cfg={cfg} />
        <span>{label}</span>
      </>
    );

  const cardInner =
    cfg.appearance.card.iconPosition === "end" ? (
      <>
        <span>{label}</span>
        <CtaPreviewIcon cfg={cfg} />
      </>
    ) : (
      <>
        <CtaPreviewIcon cfg={cfg} />
        <span>{label}</span>
      </>
    );

  return (
    <div className="pm-cta-prev">
      <div className="pm-cta-prev__title">Live preview</div>
      <p className="pm-cta-prev__hint">Theme-aware approximation. Custom images and Font Awesome both work on the storefront.</p>
      <div className="pm-cta-prev__block">
        <div className="pm-cta-prev__cap">Product page (inline)</div>
        <div className="pm-cta-prev__sheet">
          <div className="pm-cta-prev__buy">
            <span className="pm-cta-prev__fake-price">199.00 USD</span>
          </div>
          <div className={ctaRowClass(cfg.appearance.page.alignment)}>
            <span className={`pm-cta-prev__btn ${sizeP} ${shP} ${hvP} ${vCls}`} style={pageBtnStyle}>
              {pageInner}
            </span>
          </div>
        </div>
      </div>
      <div className="pm-cta-prev__block">
        <div className="pm-cta-prev__cap">
          Product card · {cfg.cardLayout.replace(/_/g, " ")} · {cfg.cardVisibility}
        </div>
        <div className={`pm-cta-prev__card pm-cta-prev__card--${cfg.cardLayout}`}>
          <div className="pm-cta-prev__card-media" />
          <div className="pm-cta-prev__card-body">
            <div className="pm-cta-prev__card-t">Sample product</div>
            <div className="pm-cta-prev__card-meta">
              <span>199 USD</span>
              {cfg.cardLayout === "inline_meta" ? (
                <span className={`pm-cta-prev__btn ${sizeC} ${shC} ${hvC} ${vCls}`} style={cardBtnStyle}>
                  {cardInner}
                </span>
              ) : null}
            </div>
          </div>
          {cfg.cardLayout !== "inline_meta" ? (
            <div className="pm-cta-prev__card-cta">
              <span className={`pm-cta-prev__btn ${sizeC} ${shC} ${hvC} ${vCls}`} style={cardBtnStyle}>
                {cardInner}
              </span>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
