"use client";

import type { CSSProperties } from "react";
import type { ResolvedProductCtaConfig } from "../../lib/product-cta";
import { buildProductCtaHref } from "../../lib/product-cta";
import type { ProductLinkContext } from "../../lib/product-whatsapp-link";
import {
  productCtaAppearanceContext,
  productCtaButtonClassList,
  productCtaWrapClassList,
  productCtaWrapStyle,
  type ProductCtaPlacement,
} from "../../lib/product-cta-ui";

type Props = {
  config: ResolvedProductCtaConfig;
  localePrefix: string;
  placement: ProductCtaPlacement;
  cardVisibility?: ResolvedProductCtaConfig["cardVisibility"];
  className?: string;
  linkContext?: ProductLinkContext;
  /** Visible label override; config label is still used for aria-label. */
  displayLabel?: string;
  /** Shorter visible label shown in narrow card container queries. */
  compactDisplayLabel?: string;
};

export function ProductCtaButton({
  config,
  localePrefix,
  placement,
  cardVisibility = "always",
  className = "",
  linkContext,
  displayLabel,
  compactDisplayLabel,
}: Props) {
  const locale = { code: localePrefix, urlPrefix: localePrefix, label: localePrefix };
  const pKey = placement === "inline" ? "inline" : placement === "floating" ? "floating" : "card";
  const active = config.enabled && config.placements[pKey];
  const href = active ? buildProductCtaHref(config, locale, linkContext) : null;
  const show = Boolean(active && href);
  const label = config.label?.trim() || "Get Quote";
  const visibleLabel = displayLabel?.trim() || label;

  if (!show || !href) return null;

  const isExternal = config.linkType === "external" || config.linkType === "whatsapp";
  const relParts = [
    isExternal || config.openInNewTab ? "noopener" : "",
    isExternal || config.openInNewTab ? "noreferrer" : "",
  ].filter(Boolean);
  const rel = relParts.length ? relParts.join(" ") : undefined;
  const target = config.openInNewTab ? "_blank" : undefined;

  const wrapClasses = [
    ...productCtaWrapClassList(config, placement, cardVisibility),
    config.linkType === "whatsapp" ? "prd-cta-wrap--whatsapp" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");
  const btnClasses = [
    ...productCtaButtonClassList(config, placement),
    config.linkType === "whatsapp" ? "prd-cta-btn--whatsapp" : "",
  ]
    .filter(Boolean)
    .join(" ");
  const wrapStyle = productCtaWrapStyle(config, placement);
  const ctx = productCtaAppearanceContext(placement);
  const inheritOff = !config.appearance[ctx].inheritThemePreset;

  return (
    <div
      className={wrapClasses}
      data-product-cta={placement}
      style={wrapStyle as CSSProperties}
      data-cta-inherit-off={inheritOff ? "1" : undefined}
    >
      <a
        href={href}
        className={btnClasses}
        target={target}
        rel={rel}
        aria-label={label ? `${label}${config.openInNewTab ? " (opens in new tab)" : ""}` : undefined}
      >
        {config.iconUrl?.trim() ? (
          <img
            className="prd-cta-btn__icon prd-cta-btn__icon--img"
            src={config.iconUrl.trim()}
            alt=""
            loading="lazy"
            decoding="async"
          />
        ) : config.icon ? (
          <i className={`${config.icon} prd-cta-btn__icon`} aria-hidden="true" />
        ) : null}
        {compactDisplayLabel ? (
          <>
            <span className="prd-cta-btn__text prd-cta-btn__text--full">{visibleLabel}</span>
            <span className="prd-cta-btn__text prd-cta-btn__text--compact">{compactDisplayLabel}</span>
          </>
        ) : (
          <span className="prd-cta-btn__text">{visibleLabel}</span>
        )}
      </a>
    </div>
  );
}
