"use client";

import { OptimizedImage } from "@/components/ui/optimized-image";
import {
  isAllowedNextImageSrc,
  isSvgMediaUrl,
  normalizeLocalMediaUrl,
  normalizeRemoteImageUrl,
} from "@/lib/config/next-image";
import { cn } from "@/lib/utils";

type Props = {
  src: string;
  alt: string;
  className?: string;
  fill?: boolean;
  sizes?: string;
};

/** Brand/category logos — bypass next/image optimizer when URLs are local uploads, SVG, or catalog CDNs. */
export function ShowcaseLogoImage({
  src,
  alt,
  className,
  fill = false,
  sizes = "128px",
}: Props) {
  const normalized = normalizeLocalMediaUrl(normalizeRemoteImageUrl(src) ?? src);

  if (!normalized) return null;

  if (isSvgMediaUrl(normalized) || !isAllowedNextImageSrc(normalized)) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={normalized}
        alt={alt}
        className={cn(fill && "absolute inset-0 h-full w-full object-contain", className)}
        decoding="async"
        data-skip-img-fade
      />
    );
  }

  return (
    <OptimizedImage
      src={normalized}
      alt={alt}
      fill={fill}
      skipFade
      sizes={sizes}
      className={cn("object-contain", className)}
    />
  );
}
