"use client";

import type { CSSProperties } from "react";
import { OptimizedImage } from "@/components/ui/optimized-image";
import { isSvgMediaUrl, normalizeLocalMediaUrl } from "@/lib/config/next-image";
import { cn } from "@/lib/utils";

type Props = {
  src: string;
  width?: number;
  height?: number;
  className?: string;
  priority?: boolean;
  /**
   * Recolor the logo glyph with the active theme primary via CSS mask.
   * Use on storefront chrome so the mark tracks Theme Studio presets.
   */
  tintWithPrimary?: boolean;
};

function maskUrl(src: string): string {
  // JSON.stringify keeps quotes/escapes valid inside url(...)
  return `url(${JSON.stringify(src)})`;
}

/** Header/site logo — SVG and local uploads must bypass next/image optimization (HTTP 400 on Hostinger). */
export function BrandLogoImage({
  src,
  width = 120,
  height = 40,
  className,
  priority = false,
  tintWithPrimary = false,
}: Props) {
  const normalized = normalizeLocalMediaUrl(src);

  if (tintWithPrimary) {
    const mask = maskUrl(normalized);
    const tintStyle = {
      backgroundColor: "var(--pre-primary, var(--primary))",
      WebkitMaskImage: mask,
      maskImage: mask,
      WebkitMaskSize: "contain",
      maskSize: "contain",
      WebkitMaskRepeat: "no-repeat",
      maskRepeat: "no-repeat",
      WebkitMaskPosition: "center",
      maskPosition: "center",
    } as CSSProperties;

    return (
      <span
        className={cn("brand-logo-tint", className)}
        style={tintStyle}
        role="img"
        aria-hidden
        data-skip-img-fade
      >
        {/* Invisible sizer keeps the logo's natural aspect ratio (mask alone has no intrinsic size). */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={normalized}
          alt=""
          width={width}
          height={height}
          className="brand-logo-tint__sizer"
          decoding="async"
          draggable={false}
        />
      </span>
    );
  }

  if (isSvgMediaUrl(normalized)) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={normalized}
        alt=""
        width={width}
        height={height}
        className={cn(className)}
        decoding="async"
        data-skip-img-fade
        suppressHydrationWarning
      />
    );
  }

  return (
    <OptimizedImage
      src={normalized}
      alt=""
      width={width}
      height={height}
      priority={priority}
      aboveFold={priority}
      skipFade
      sizes={`${width}px`}
      className={className}
      suppressHydrationWarning
    />
  );
}
