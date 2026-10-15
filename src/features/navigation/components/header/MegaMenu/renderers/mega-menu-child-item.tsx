"use client";

import type { MegaMenuChildViewModel } from "@/features/navigation/mega-menu-resolver";
import { MegaMenuCardFrameMedia, NavIconMedia } from "../mega-menu-media";

type Props = {
  child: MegaMenuChildViewModel;
  onLinkClick?: () => void;
  /** Unused. Per-item display choice wins over the panel layout. */
  prefer?: "list" | "icon" | "image" | "card";
  /** When false, list-row nav glyphs are omitted. Photo cards are unchanged. */
  showNavIcon?: boolean;
};

function chosenMenuIcon(child: MegaMenuChildViewModel): string | undefined {
  return child.child.icon?.trim() || undefined;
}

/** Logo image when one is selected. A chosen menu icon is used when the logo is missing. */
function iconMark(child: MegaMenuChildViewModel): { icon?: string; iconImageUrl?: string } {
  const chosen = chosenMenuIcon(child);
  const logoUrl = child.sourceDisplay === "logo" ? child.sourceLogoUrl?.trim() : undefined;
  if (logoUrl) return { iconImageUrl: logoUrl };
  if (chosen) return { icon: chosen };
  const iconImage =
    child.sourceIconUrl?.trim() ||
    (child.iconImageUrl?.trim() && child.iconImageUrl.trim() !== child.sourceLogoUrl?.trim()
      ? child.iconImageUrl.trim()
      : undefined);
  if (iconImage) return { iconImageUrl: iconImage };
  return { icon: child.icon?.trim() || undefined };
}

function resolvedAppearance(child: MegaMenuChildViewModel): "list" | "icon" | "image" {
  const display = child.sourceDisplay;
  if (display === "image" && (child.sourceImageUrl?.trim() || child.photoUrl?.trim() || child.image?.trim())) {
    return "image";
  }
  if (display === "logo" && child.sourceLogoUrl?.trim()) return "icon";
  if (display === "icon" && (child.sourceIconUrl?.trim() || child.icon?.trim())) return "icon";
  if (display === "none") return "list";
  const appearance = child.appearance === "card" ? "image" : child.appearance || "list";
  if (appearance === "image" && !child.photoUrl?.trim() && !child.image?.trim()) return "list";
  if (appearance === "icon" && !child.iconImageUrl?.trim() && !child.icon?.trim() && !child.sourceLogoUrl?.trim()) {
    return "list";
  }
  if (appearance === "icon" || appearance === "image") return appearance;
  return "list";
}

/**
 * Renders a single mega-menu child as text, icon only, or photo only.
 */
export function MegaMenuChildItem({ child, onLinkClick }: Props) {
  const appearance = resolvedAppearance(child);
  const photoUrl = child.sourceImageUrl?.trim() || child.photoUrl?.trim() || child.image?.trim() || undefined;

  if (appearance === "image") {
    return (
      <a
        href={child.href}
        className="hb-mega-v2-featured-card"
        onClick={() => onLinkClick?.()}
      >
        <span className="hb-mega-v2-featured-card__media" aria-hidden={!photoUrl}>
          <MegaMenuCardFrameMedia cardMedia="image" imageUrl={photoUrl} alt={child.label} />
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
          <NavIconMedia {...iconMark(child)} alt="" />
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
      <span className="hb-mega-v2-link__label">{child.label}</span>
    </a>
  );
}
