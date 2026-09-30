"use client";

import { Icon } from "@/features/icons/components/icon";
import { cn } from "@/lib/utils";

type Props = {
  icon?: string | null;
  className?: string;
  /** Wrapper class for CSS breakpoint visibility (desktop top-nav). */
  slotClassName?: string;
};

/** True for legacy Font Awesome class suffixes stored on MenuItem.icon. */
export function isLegacyFaNavIcon(value: string): boolean {
  return /^fa-[a-z0-9-]+$/i.test(value.trim());
}

/**
 * Renders MenuItem.icon for storefront nav:
 * - legacy Font Awesome suffixes like `fa-star`
 * - Icon Library iconIds like `search` / `home`
 */
export function NavMenuGlyph({ icon, className, slotClassName }: Props) {
  const v = icon?.trim();
  if (!v) return null;

  const glyph = isLegacyFaNavIcon(v) ? (
    <i className={cn(`fas ${v}`, className)} aria-hidden />
  ) : (
    <Icon iconId={v} className={cn("hb-nav-icon", className)} aria-hidden="true" />
  );

  if (!slotClassName) return glyph;

  return <span className={slotClassName}>{glyph}</span>;
}
