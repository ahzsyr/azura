"use client";

import Image, { type ImageProps } from "next/image";
import { useEffect, useRef, useState } from "react";
import {
  normalizeLocalMediaUrl,
  normalizeRemoteImageUrl,
  shouldOptimizeNextImage,
} from "@/lib/config/next-image";
import { cn } from "@/lib/utils";

type OptimizedImageProps = ImageProps & {
  /** Below-the-fold images default to lazy loading */
  aboveFold?: boolean;
  /** Disable lazy fade-in (e.g. tiny thumbnails) */
  skipFade?: boolean;
};

/**
 * Wrapper around next/image with sensible defaults for LCP and CLS.
 * Lazy fade-in runs only after mount so SSR/hydration stay in sync.
 *
 * Chromium/Edge may log "[Intervention] Images loaded lazily and replaced with
 * placeholders" for below-fold images using native loading="lazy". That is expected
 * browser optimization, not an application error. Use aboveFold/priority for LCP images.
 */
export function OptimizedImage({
  aboveFold = false,
  loading,
  quality = 80,
  sizes,
  className,
  onLoad,
  skipFade = false,
  unoptimized,
  src: rawSrc,
  ...props
}: OptimizedImageProps) {
  const imgRef = useRef<HTMLImageElement>(null);
  const src =
    typeof rawSrc === "string"
      ? normalizeLocalMediaUrl(normalizeRemoteImageUrl(rawSrc) ?? rawSrc)
      : rawSrc;
  const resolvedUnoptimized =
    unoptimized ??
    (typeof src === "string" ? !shouldOptimizeNextImage(src) : false);
  const resolvedLoading = loading ?? (aboveFold ? undefined : "lazy");
  const shouldFade =
    !skipFade && !aboveFold && !props.priority && resolvedLoading === "lazy";
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!shouldFade) return;
    const img = imgRef.current;
    if (img?.complete) setLoaded(true);
  }, [shouldFade]);

  return (
    <Image
      ref={imgRef}
      {...props}
      src={src}
      unoptimized={resolvedUnoptimized}
      quality={quality}
      sizes={sizes}
      loading={resolvedLoading}
      priority={aboveFold ? true : props.priority}
      className={cn(
        className,
        shouldFade && !loaded && "img-fade-pending",
        shouldFade && loaded && "img-fade-loaded",
      )}
      onLoad={(event) => {
        if (shouldFade) setLoaded(true);
        onLoad?.(event);
      }}
    />
  );
}
