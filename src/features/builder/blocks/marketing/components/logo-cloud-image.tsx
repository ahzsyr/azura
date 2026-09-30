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
  sizes?: string;
  loading?: "eager" | "lazy";
};

/** Logo Cloud images may use arbitrary external URLs not listed in next/image remote patterns. */
export function LogoCloudImage({
  src,
  alt,
  className,
  sizes = "128px",
  loading = "lazy",
}: Props) {
  const normalized = normalizeLocalMediaUrl(normalizeRemoteImageUrl(src) ?? src);

  if (isSvgMediaUrl(normalized) || !isAllowedNextImageSrc(normalized)) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={normalized}
        alt={alt}
        className={cn("absolute inset-0 h-full w-full object-contain", className)}
        loading={loading}
        decoding="async"
        data-skip-img-fade
      />
    );
  }

  return (
    <OptimizedImage
      src={normalized}
      alt={alt}
      fill
      skipFade
      sizes={sizes}
      loading={loading}
      className={cn("object-contain", className)}
    />
  );
}
