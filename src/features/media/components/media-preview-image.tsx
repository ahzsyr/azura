"use client";

import type { ImageProps } from "next/image";
import { OptimizedImage } from "@/components/ui/optimized-image";
import { isSvgMediaUrl, normalizeLocalMediaUrl } from "@/lib/config/next-image";
import { cn } from "@/lib/utils";

/** Admin/media thumbnails — bypasses `/_next/image` for local `/uploads/` files and SVG. */
export function MediaPreviewImage({ src, className, alt = "", fill, ...props }: ImageProps) {
  if (typeof src === "string" && isSvgMediaUrl(src)) {
    const normalized = normalizeLocalMediaUrl(src);
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={normalized}
        alt={typeof alt === "string" ? alt : ""}
        className={cn(fill && "absolute inset-0 h-full w-full", className)}
        decoding="async"
        data-skip-img-fade
      />
    );
  }

  return (
    <OptimizedImage
      {...props}
      skipFade
      loading="lazy"
      priority={false}
      src={src}
      alt={alt}
      fill={fill}
      className={className}
    />
  );
}
