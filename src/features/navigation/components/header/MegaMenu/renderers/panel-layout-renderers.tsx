"use client";

import type { MegaMenuChildViewModel } from "@/features/navigation/mega-menu-resolver";
import { MegaMenuVisualImage, NavGlyph, NavGlyphOrImage } from "../mega-menu-media";

type Props = {
  children: MegaMenuChildViewModel[];
  onLinkClick?: () => void;
};

export function LinkListRenderer({ children, onLinkClick }: Props) {
  return (
    <div className="hb-mega-v2-links">
      {children.map((child) => (
        <a
          key={child.id}
          href={child.href}
          className="hb-mega-v2-link"
          onClick={() => onLinkClick?.()}
        >
          <NavGlyphOrImage icon={child.icon} imageUrl={child.image} />
          <span className="hb-mega-v2-link__label">{child.label}</span>
        </a>
      ))}
    </div>
  );
}

export function CardGridRenderer({
  children,
  columns,
  gap,
  onLinkClick,
}: Props & { columns: number; gap: string }) {
  return (
    <div
      className="hb-mega-v2-cards"
      data-gap={gap}
      style={{ gridTemplateColumns: `repeat(${columns}, minmax(min(100%, 140px), 1fr))` }}
    >
      {children.map((child) => (
        <a
          key={child.id}
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
          {child.subtitle ? <span className="hb-mega-v2-card__subtitle">{child.subtitle}</span> : null}
          {child.badge ? <span className="hb-mega-v2-card__badge">{child.badge}</span> : null}
          <span className="hb-mega-v2-card__cta">{child.ctaLabel?.trim() || "Learn More"}</span>
        </a>
      ))}
    </div>
  );
}

export function FeaturedRenderer({
  children,
  columns,
  gap,
  onLinkClick,
}: Props & { columns: number; gap: string }) {
  return (
    <div
      className="hb-mega-v2-featured"
      data-gap={gap}
      style={{ gridTemplateColumns: `repeat(${columns}, minmax(min(100%, 160px), 1fr))` }}
    >
      {children.map((child) => (
        <a
          key={child.id}
          href={child.href}
          className="hb-mega-v2-featured-card"
          onClick={() => onLinkClick?.()}
        >
          <span className="hb-mega-v2-featured-card__media">
            <MegaMenuVisualImage src={child.image} alt={child.label} />
          </span>
          <span className="hb-mega-v2-featured-card__title">{child.label}</span>
          {child.subtitle ? (
            <span className="hb-mega-v2-featured-card__subtitle">{child.subtitle}</span>
          ) : null}
          <span className="hb-mega-v2-featured-card__cta">
            {child.ctaLabel?.trim() || "Learn More"}
          </span>
        </a>
      ))}
    </div>
  );
}

export function ColumnRenderer({
  columnGroups,
  children,
  onLinkClick,
}: {
  columnGroups?: {
    id: string;
    heading: string;
    children: MegaMenuChildViewModel[];
    ctaLabel?: string;
    ctaHref?: string;
  }[];
  children: MegaMenuChildViewModel[];
  onLinkClick?: () => void;
}) {
  if (columnGroups?.length) {
    return (
      <div className="hb-mega-v2-columns">
        {columnGroups.map((group) => (
          <div key={group.id} className="hb-mega-v2-column">
            <h4 className="hb-mega-v2-column__heading">{group.heading}</h4>
            <ul className="hb-mega-v2-column__list">
              {group.children.map((child) => (
                <li key={child.id}>
                  <a href={child.href} onClick={() => onLinkClick?.()}>
                    {child.label}
                  </a>
                </li>
              ))}
            </ul>
            {group.ctaLabel && group.ctaHref ? (
              <a
                href={group.ctaHref}
                className="hb-mega-v2-column__cta"
                onClick={() => onLinkClick?.()}
              >
                {group.ctaLabel}
              </a>
            ) : null}
          </div>
        ))}
      </div>
    );
  }

  return <LinkListRenderer children={children} onLinkClick={onLinkClick} />;
}

export function IconGridRenderer({
  children,
  columns,
  gap,
  onLinkClick,
}: Props & { columns: number; gap: string }) {
  return (
    <div
      className="hb-mega-v2-icon-grid"
      data-gap={gap}
      style={{ gridTemplateColumns: `repeat(${columns}, minmax(5.5rem, 1fr))` }}
    >
      {children.map((child) => (
        <a
          key={child.id}
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
          <span className="hb-mega-v2-icon-item__cta">
            {child.ctaLabel?.trim() || "Learn More"}
          </span>
        </a>
      ))}
    </div>
  );
}

export function ProductGridRenderer({
  children,
  columns,
  gap,
  onLinkClick,
}: Props & { columns: number; gap: string }) {
  return (
    <div
      className="hb-mega-v2-product-grid"
      data-gap={gap}
      style={{ gridTemplateColumns: `repeat(${columns}, minmax(min(100%, 140px), 1fr))` }}
    >
      {children.map((child) => (
        <a
          key={child.id}
          href={child.href}
          className="hb-mega-v2-product"
          onClick={() => onLinkClick?.()}
        >
          <span className="hb-mega-v2-product__media">
            <MegaMenuVisualImage src={child.image} alt={child.label} />
          </span>
          <span className="hb-mega-v2-product__title">{child.label}</span>
          {child.subtitle ? (
            <span className="hb-mega-v2-product__subtitle">{child.subtitle}</span>
          ) : null}
          {child.badge ? <span className="hb-mega-v2-product__badge">{child.badge}</span> : null}
          {child.ctaLabel ? (
            <span className="hb-mega-v2-product__cta">{child.ctaLabel}</span>
          ) : null}
        </a>
      ))}
    </div>
  );
}

export function MixedRenderer({
  featured,
  featuredCtaLabel,
  children,
  columnGroups,
  onLinkClick,
}: {
  featured?: MegaMenuChildViewModel | null;
  featuredCtaLabel?: string;
  children: MegaMenuChildViewModel[];
  columnGroups?: {
    id: string;
    heading: string;
    children: MegaMenuChildViewModel[];
    ctaLabel?: string;
    ctaHref?: string;
  }[];
  onLinkClick?: () => void;
}) {
  const secondary = featured ? children.filter((c) => c.id !== featured.id) : children;
  return (
    <div className="hb-mega-v2-mixed">
      {featured ? (
        <a
          href={featured.href}
          className="hb-mega-v2-mixed__featured"
          onClick={() => onLinkClick?.()}
        >
          <span className="hb-mega-v2-mixed__featured-media">
            {featured.image ? (
              <MegaMenuVisualImage src={featured.image} alt={featured.label} />
            ) : (
              <NavGlyph icon={featured.icon} />
            )}
          </span>
          <span className="hb-mega-v2-mixed__featured-title">{featured.label}</span>
          {featured.subtitle ? (
            <span className="hb-mega-v2-mixed__featured-body">{featured.subtitle}</span>
          ) : null}
          <span className="hb-mega-v2-mixed__featured-cta">
            {featured.ctaLabel || featuredCtaLabel || "Learn More"}
          </span>
        </a>
      ) : null}
      <div className="hb-mega-v2-mixed__secondary">
        {columnGroups?.length ? (
          <ColumnRenderer columnGroups={columnGroups} children={secondary} onLinkClick={onLinkClick} />
        ) : (
          <CardGridRenderer children={secondary} columns={Math.min(4, Math.max(2, secondary.length))} gap="md" onLinkClick={onLinkClick} />
        )}
      </div>
    </div>
  );
}
