"use client";

import { useEffect, useState } from "react";
import { DEFAULT_MEDIA_PLACEHOLDER, resolveMediaUrl } from "@/features/media/constants";
import { NavMenuGlyph } from "../NavMenuGlyph";

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
