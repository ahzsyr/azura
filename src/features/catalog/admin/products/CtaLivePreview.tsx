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
import {
  diagnosticsForSurface,
  resolveProductActionVisibility,
} from "@/features/products/lib/resolve-product-action-visibility";
import type { ProductActionVisibilityContext } from "./ProductActionVisibilityPanel";

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

export function CtaLivePreview({
  cfg,
  visibilityContext,
}: {
  cfg: ResolvedProductCtaConfig;
  visibilityContext?: ProductActionVisibilityContext;
}) {
  const diagnostics = visibilityContext
    ? resolveProductActionVisibility({ ...visibilityContext, productCta: cfg })
    : null;
  const inlineVisible =
    diagnostics?.find((d) => d.action === "cta" && d.surface === "pdpInlineCta")?.visible ??
    (cfg.enabled && cfg.placements.inline);
  const cardVisible =
    diagnostics?.find((d) => d.action === "cta" && d.surface === "card")?.visible ??
    (cfg.enabled && cfg.placements.card && Boolean(cfg.label));

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
    ...(inlineVisible ? {} : { opacity: 0.45 }),
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
    ...(cardVisible ? {} : { opacity: 0.45 }),
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

  const inlineFail = visibilityContext
    ? diagnosticsForSurface(diagnostics ?? [], "cta", "pdpInlineCta")?.gates.find((g) => !g.pass)
    : undefined;
  const cardFail = visibilityContext
    ? diagnosticsForSurface(diagnostics ?? [], "cta", "card")?.gates.find((g) => !g.pass)
    : undefined;

  return (
    <div className="pm-cta-prev">
      <div className="pm-cta-prev__title">Live preview</div>
      <p className="pm-cta-prev__hint">
        Reflects storefront visibility gates. Muted blocks are hidden on the live site.
      </p>
      <div className={`pm-cta-prev__block${inlineVisible ? "" : " pm-cta-prev__block--muted"}`}>
        <div className="pm-cta-prev__cap">Product page (inline)</div>
        {inlineVisible ? null : (
          <p className="pm-cta-prev__muted">{inlineFail?.detail ?? inlineFail?.label ?? "Hidden on product page"}</p>
        )}
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
      <div className={`pm-cta-prev__block${cardVisible ? "" : " pm-cta-prev__block--muted"}`}>
        <div className="pm-cta-prev__cap">
          Product card · {cfg.cardLayout.replace(/_/g, " ")} · {cfg.cardVisibility}
        </div>
        {cardVisible ? null : (
          <p className="pm-cta-prev__muted">{cardFail?.detail ?? cardFail?.label ?? "Hidden on product cards"}</p>
        )}
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
