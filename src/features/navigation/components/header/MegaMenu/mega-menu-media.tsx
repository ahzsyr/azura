"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { DEFAULT_MEDIA_PLACEHOLDER, resolveMediaUrl } from "@/features/media/constants";
import type { NavIconVisibility } from "@/features/navigation/nav-icon-visibility";
import { resolveItemShowsNavIcon } from "@/features/navigation/nav-icon-visibility";
import type { MenuIconPlacement } from "@/features/navigation/types";
import { NavMenuGlyph } from "../NavMenuGlyph";

const MegaMenuIconVisibilityContext = createContext<NavIconVisibility | null>(null);

export function MegaMenuIconVisibilityProvider({
  value,
  children,
}: {
  value: NavIconVisibility;
  children: ReactNode;
}) {
  return (
    <MegaMenuIconVisibilityContext.Provider value={value}>
      {children}
    </MegaMenuIconVisibilityContext.Provider>
  );
}

/** Desktop mega menus: whether this item's nav glyph should render. */
export function useMegaMenuShowsNavIcon(placement: MenuIconPlacement | undefined): boolean {
  const defaults = useContext(MegaMenuIconVisibilityContext);
  if (!defaults) return true;
  return resolveItemShowsNavIcon(placement, "desktop", defaults);
}

export function MegaMenuVisualImage({ src, alt }: { src?: string | null; alt: string }) {
  const [imgSrc, setImgSrc] = useState(() => resolveMediaUrl(src));

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setImgSrc(resolveMediaUrl(src));
  }, [src]);

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={imgSrc}
      alt={alt}
      decoding="async"
      data-skip-img-fade=""
      onError={() => setImgSrc(DEFAULT_MEDIA_PLACEHOLDER)}
    />
  );
}

export function NavGlyph({ icon }: { icon?: string }) {
  return <NavMenuGlyph icon={icon} className="hb-nav-icon" slotClassName="hb-nav-icon-slot" />;
}

/**
 * Card frame contents. A photo stays in the frame when media is `image`, even if the item also has an icon.
 * `icon` fills the frame with the glyph and does not use the photo.
 */
export function MegaMenuCardFrameMedia({
  cardMedia,
  imageUrl,
  icon,
  alt = "",
}: {
  cardMedia: "image" | "icon" | null;
  imageUrl?: string;
  icon?: string;
  alt?: string;
}) {
  if (cardMedia === "icon") return <NavGlyph icon={icon} />;
  if (imageUrl?.trim()) return <MegaMenuVisualImage src={imageUrl} alt={alt} />;
  return <NavGlyph icon={icon} />;
}

/** Icon glyph, or linked catalog image (e.g. brand logo) when no icon is set. */
export function NavGlyphOrImage({
  icon,
  imageUrl,
  alt = "",
}: {
  icon?: string;
  imageUrl?: string;
  alt?: string;
}) {
  if (icon?.trim()) return <NavGlyph icon={icon} />;
  if (imageUrl?.trim()) {
    return <MegaMenuVisualImage src={imageUrl} alt={alt} />;
  }
  return null;
}
