"use client";

import type { MegaMenuChildViewModel } from "@/features/navigation/mega-menu-resolver";
import { MegaMenuVisualImage, NavGlyph, NavGlyphOrImage } from "../mega-menu-media";

type Props = {
  child: MegaMenuChildViewModel;
  onLinkClick?: () => void;
  /** Optional layout hint when appearance is automatic-resolved to a panel default. */
  prefer?: "list" | "icon" | "image" | "card";
};

/**
 * Renders a single mega-menu child by its per-item appearance
 * (list / icon / image / card), independent of panel layout.
 */
export function MegaMenuChildItem({ child, onLinkClick, prefer }: Props) {
  const appearance = child.appearance || prefer || "list";

  if (appearance === "card") {
    return (
      <a
        href={child.href}
        className="hb-mega-v2-card"
        onClick={() => onLinkClick?.()}
      >
        <span className="hb-mega-v2-card__media" aria-hidden>
          {child.image ? (
            <MegaMenuVisualImage src={child.image} alt="" />
          ) : (
            <NavGlyph icon={child.icon} />
          )}
        </span>
        <span className="hb-mega-v2-card__title">{child.label}</span>
        {child.subtitle ? (
          <span className="hb-mega-v2-card__subtitle">{child.subtitle}</span>
        ) : (
          <span className="hb-mega-v2-card__subtitle" aria-hidden>
            {"\u00a0"}
          </span>
        )}
        {child.badge ? <span className="hb-mega-v2-card__badge">{child.badge}</span> : null}
        <span className="hb-mega-v2-card__cta">{child.ctaLabel?.trim() || "Learn More"}</span>
      </a>
    );
  }

  if (appearance === "image") {
    return (
      <a
        href={child.href}
        className="hb-mega-v2-featured-card"
        onClick={() => onLinkClick?.()}
      >
        <span className="hb-mega-v2-featured-card__media" aria-hidden={!child.image}>
          {child.image ? (
            <MegaMenuVisualImage src={child.image} alt={child.label} />
          ) : (
            <NavGlyph icon={child.icon} />
          )}
        </span>
        <span className="hb-mega-v2-featured-card__title">{child.label}</span>
        {child.subtitle ? (
          <span className="hb-mega-v2-featured-card__subtitle">{child.subtitle}</span>
        ) : (
          <span className="hb-mega-v2-featured-card__subtitle" aria-hidden>
            {"\u00a0"}
          </span>
        )}
        <span className="hb-mega-v2-featured-card__cta">
          {child.ctaLabel?.trim() || "Learn More"}
        </span>
      </a>
    );
  }

  if (appearance === "icon") {
    return (
      <a
        href={child.href}
        className="hb-mega-v2-icon-item"
        data-variant="centered"
        onClick={() => onLinkClick?.()}
      >
        <span className="hb-mega-v2-icon-item__icon" aria-hidden>
          <NavGlyphOrImage icon={child.icon} imageUrl={child.image} alt="" />
        </span>
        <span className="hb-mega-v2-icon-item__label">{child.label}</span>
        {child.badge ? <span className="hb-mega-v2-icon-item__badge">{child.badge}</span> : null}
        {child.subtitle ? (
          <span className="hb-mega-v2-icon-item__desc">{child.subtitle}</span>
        ) : null}
      </a>
    );
  }

  return (
    <a
      href={child.href}
      className="hb-mega-v2-link"
      onClick={() => onLinkClick?.()}
    >
      <NavGlyphOrImage icon={child.icon} imageUrl={child.image} />
      <span className="hb-mega-v2-link__label">{child.label}</span>
    </a>
  );
}
