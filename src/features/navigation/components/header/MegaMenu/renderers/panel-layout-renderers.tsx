"use client";

import type { MegaMenuChildViewModel } from "@/features/navigation/mega-menu-resolver";
import { MegaMenuVisualImage, NavGlyph } from "../mega-menu-media";
import { MegaMenuChildItem } from "./mega-menu-child-item";

type Props = {
  children: MegaMenuChildViewModel[];
  onLinkClick?: () => void;
};

export function LinkListRenderer({ children, onLinkClick }: Props) {
  return (
    <div className="hb-mega-v2-links">
      {children.map((child) => (
        <MegaMenuChildItem key={child.id} child={child} onLinkClick={onLinkClick} prefer="list" />
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
        <MegaMenuChildItem key={child.id} child={child} onLinkClick={onLinkClick} prefer="card" />
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
        <MegaMenuChildItem key={child.id} child={child} onLinkClick={onLinkClick} prefer="image" />
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
                  <MegaMenuChildItem child={child} onLinkClick={onLinkClick} prefer="list" />
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
        <MegaMenuChildItem key={child.id} child={child} onLinkClick={onLinkClick} prefer="icon" />
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
      {children.map((child) => {
        // Keep product-tile markup for card/automatic; honor list/icon/image overrides.
        if (child.appearance === "list" || child.appearance === "icon" || child.appearance === "image") {
          return (
            <MegaMenuChildItem key={child.id} child={child} onLinkClick={onLinkClick} prefer="card" />
          );
        }
        return (
          <a
            key={child.id}
            href={child.href}
            className="hb-mega-v2-product"
            onClick={() => onLinkClick?.()}
          >
            <span className="hb-mega-v2-product__media" aria-hidden={!child.image}>
              {child.image ? (
                <MegaMenuVisualImage src={child.image} alt={child.label} />
              ) : (
                <NavGlyph icon={child.icon} />
              )}
            </span>
            <span className="hb-mega-v2-product__title">{child.label}</span>
            {child.subtitle ? (
              <span className="hb-mega-v2-product__subtitle">{child.subtitle}</span>
            ) : (
              <span className="hb-mega-v2-product__subtitle" aria-hidden>
                {"\u00a0"}
              </span>
            )}
            {child.badge ? <span className="hb-mega-v2-product__badge">{child.badge}</span> : null}
            <span className="hb-mega-v2-product__cta">
              {child.ctaLabel?.trim() || "Learn More"}
            </span>
          </a>
        );
      })}
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
          <CardGridRenderer
            children={secondary}
            columns={Math.min(4, Math.max(2, secondary.length))}
            gap="md"
            onLinkClick={onLinkClick}
          />
        )}
      </div>
    </div>
  );
}
