"use client";

import Image, { type ImageProps } from "next/image";
import { useEffect, useRef, useState } from "react";
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
  ...props
}: OptimizedImageProps) {
  const imgRef = useRef<HTMLImageElement>(null);
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
