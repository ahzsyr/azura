"use client";

import { OptimizedImage } from "@/components/ui/optimized-image";
import { isSvgMediaUrl, normalizeLocalMediaUrl } from "@/lib/config/next-image";
import { cn } from "@/lib/utils";

type Props = {
  src: string;
  width?: number;
  height?: number;
  className?: string;
  priority?: boolean;
};

/** Header/site logo — SVG and local uploads must bypass next/image optimization (HTTP 400 on Hostinger). */
export function BrandLogoImage({
  src,
  width = 120,
  height = 40,
  className,
  priority = true,
}: Props) {
  const normalized = normalizeLocalMediaUrl(src);

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
