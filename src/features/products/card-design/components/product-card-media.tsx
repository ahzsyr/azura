"use client";

import Image from "next/image";
import { useCallback, useState, type CSSProperties } from "react";
import { Link as LocaleLink } from "@/i18n/navigation";
import { DEFAULT_MEDIA_PLACEHOLDER } from "@/features/media/constants";
import { IMAGE_SIZES } from "@/lib/config/performance";
import { normalizeRemoteImageUrl, shouldOptimizeNextImage } from "@/lib/config/next-image";
import { sharedElementAttrs } from "@/lib/navigation/shared-elements";
import type { ProductCardRenderContext } from "./product-card-context";
import { ProductCardRatingBadge } from "./product-card-badges";

type Props = {
  ctx: ProductCardRenderContext;
};

function normalizeSrc(src: string | undefined): string | undefined {
  if (!src) return undefined;
  return normalizeRemoteImageUrl(src) ?? src;
}

export function ProductCardMedia({ ctx }: Props) {
  const { product, design, navHref, priority, linkPrefetch } = ctx;
  const [loaded, setLoaded] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [failedSrcs, setFailedSrcs] = useState<Set<string>>(() => new Set());

  const galleryImages = [
    normalizeSrc(product.primary_image),
    ...(product.gallery_images ?? []).map(normalizeSrc),
    normalizeSrc(product.secondary_image),
  ].filter((src, i, arr): src is string => Boolean(src) && arr.indexOf(src) === i);

  const images = galleryImages.slice(0, design.media.maxGalleryImages);
  const primarySrc = images[0];
  const hoverSrc = design.media.hoverSwap && images.length > 1 ? images[1] : undefined;
  const showGallery = design.media.galleryEnabled && images.length > 1;

  const imageShared = sharedElementAttrs("product", product.slug, "image");

  const onSwipe = useCallback(
    (direction: 1 | -1) => {
      if (!showGallery) return;
      setActiveIndex((i) => {
        const next = i + direction;
        if (next < 0) return images.length - 1;
        if (next >= images.length) return 0;
        return next;
      });
    },
    [showGallery, images.length],
  );

  const displaySrc = showGallery ? images[activeIndex] : primarySrc;
  const resolvedSrc =
    displaySrc && !failedSrcs.has(displaySrc) ? displaySrc : undefined;
  const imageSrc = resolvedSrc ?? DEFAULT_MEDIA_PLACEHOLDER;
  const imageUnoptimized = !shouldOptimizeNextImage(imageSrc);
  const showHoverSwap = Boolean(hoverSrc && !showGallery && resolvedSrc);
  const mediaLinkStyle: CSSProperties | undefined = showHoverSwap
    ? ({ "--pl-card-hover-image": `url("${hoverSrc}")` } as CSSProperties)
    : undefined;

  const onImageLoad = useCallback(() => {
    setLoaded(true);
  }, []);

  const onImageError = useCallback(() => {
    if (!resolvedSrc) return;
    setFailedSrcs((prev) => {
      if (prev.has(resolvedSrc)) return prev;
      const next = new Set(prev);
      next.add(resolvedSrc);
      return next;
    });
    setLoaded(true);
  }, [
    resolvedSrc,
    product.slug,
    imageSrc,
    showGallery,
    activeIndex,
    failedSrcs.size,
    design.media.showSkeleton,
  ]);

  return (
    <LocaleLink
      href={navHref}
      prefetch={linkPrefetch}
      className={[
        "pl-card__media-link",
        design.media.showSkeleton && !loaded && resolvedSrc ? "pl-card__media-link--loading" : "",
        design.media.effect === "tilt" ? "pl-card__media-link--tilt" : "",
        showHoverSwap ? "pl-card__media-link--hover-swap" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      style={mediaLinkStyle}
      data-pl-hover-swap={showHoverSwap ? "" : undefined}
      aria-label={`${product.name} — view product`}
      onTouchStart={(e) => {
        if (!showGallery) return;
        const touch = e.touches[0];
        (e.currentTarget as HTMLElement & { _touchX?: number })._touchX = touch.clientX;
      }}
      onTouchEnd={(e) => {
        if (!showGallery) return;
        const el = e.currentTarget as HTMLElement & { _touchX?: number };
        const startX = el._touchX;
        if (startX == null) return;
        const delta = e.changedTouches[0].clientX - startX;
        if (Math.abs(delta) > 40) onSwipe(delta < 0 ? 1 : -1);
      }}
    >
      <>
        <Image
          className="pl-card__media-img"
          src={imageSrc}
          alt={product.name}
          width={480}
          height={480}
          sizes={IMAGE_SIZES.card}
          priority={priority}
          loading={priority ? undefined : "lazy"}
          unoptimized={imageUnoptimized}
          data-priority-img={priority ? "" : undefined}
          data-shared-element={imageShared["data-shared-element"]}
          data-shared-element-type={imageShared["data-shared-element-type"]}
          data-shared-element-id={imageShared["data-shared-element-id"]}
          style={imageShared.style}
          onLoad={onImageLoad}
          onError={onImageError}
        />
        {design.media.showSkeleton && resolvedSrc ? (
          <span className="pl-card__media-skeleton" aria-hidden="true" />
        ) : null}
      </>
      {showGallery && images.length > 1 ? (
        <div className="pl-card__media-dots" aria-hidden="true">
          {images.map((_, i) => (
            <span
              key={i}
              className={`pl-card__media-dot${i === activeIndex ? " is-active" : ""}`}
            />
          ))}
        </div>
      ) : null}
      <ProductCardRatingBadge ctx={ctx} />
    </LocaleLink>
  );
}
