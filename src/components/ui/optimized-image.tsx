"use client";

import Image, { type ImageProps } from "next/image";
import { useEffect, useRef, useState } from "react";
import { isAllowedNextImageSrc } from "@/lib/config/next-image";
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
  ...props
}: OptimizedImageProps) {
  const imgRef = useRef<HTMLImageElement>(null);
  const resolvedUnoptimized =
    unoptimized ??
    (typeof props.src === "string" ? !isAllowedNextImageSrc(props.src) : false);
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
