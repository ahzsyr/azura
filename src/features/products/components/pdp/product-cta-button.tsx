"use client";

import type { CSSProperties } from "react";
import type { ResolvedProductCtaConfig } from "../../lib/product-cta";
import { buildProductCtaHref } from "../../lib/product-cta";
import {
  productCtaAppearanceContext,
  productCtaButtonClassList,
  productCtaWrapClassList,
  productCtaWrapStyle,
  type ProductCtaPlacement,
} from "../../lib/product-cta-ui";
import { getLocaleByPrefix, defaultLocaleConfig } from "../../lib/i18n/config";

type Props = {
  config: ResolvedProductCtaConfig;
  localePrefix: string;
  placement: ProductCtaPlacement;
  cardVisibility?: ResolvedProductCtaConfig["cardVisibility"];
  className?: string;
};

export function ProductCtaButton({
  config,
  localePrefix,
  placement,
  cardVisibility = "always",
  className = "",
}: Props) {
  const locale = getLocaleByPrefix(localePrefix) ?? defaultLocaleConfig;
  const pKey = placement === "inline" ? "inline" : placement === "floating" ? "floating" : "card";
  const active = config.enabled && config.placements[pKey];
  const href = active ? buildProductCtaHref(config, locale) : null;
  const show = Boolean(active && href);

  if (!show || !href) return null;

  const isExternal = config.linkType === "external";
  const relParts = [
    isExternal || config.openInNewTab ? "noopener" : "",
    isExternal || config.openInNewTab ? "noreferrer" : "",
  ].filter(Boolean);
  const rel = relParts.length ? relParts.join(" ") : undefined;
  const target = config.openInNewTab ? "_blank" : undefined;

  const wrapClasses = [...productCtaWrapClassList(config, placement, cardVisibility), className]
    .filter(Boolean)
    .join(" ");
  const btnClasses = productCtaButtonClassList(config, placement).join(" ");
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
        aria-label={
          config.label
            ? `${config.label}${config.openInNewTab ? " (opens in new tab)" : ""}`
            : undefined
        }
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
        <span className="prd-cta-btn__text">{config.label}</span>
      </a>
    </div>
  );
}
