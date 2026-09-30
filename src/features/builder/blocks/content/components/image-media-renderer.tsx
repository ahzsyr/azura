import type { CSSProperties } from "react";
import { cn } from "@/lib/utils";
import { normalizeLocalMediaUrl, normalizeRemoteImageUrl } from "@/lib/config/next-image";
import {
  MEDIA_ASPECT_CLASS,
  MEDIA_SIZE_CLASS,
  resolveCustomDimensionStyle,
  type ImageMediaAspectRatio,
  type ImageMediaDimensionUnit,
  type ImageMediaObjectFit,
  type ImageMediaSize,
} from "@/features/builder/blocks/content/lib/image-block-model";

type Props = {
  url: string;
  alt: string;
  lazyLoad?: boolean;
  borderRadius?: string | number;
  /** Cover fill for background / overlay underlay */
  fill?: boolean;
  className?: string;
  /** Constrain frame max-width (legacy banner behavior) */
  hugOrAuthoredWidth?: boolean;
  aspectRatio?: ImageMediaAspectRatio;
  size?: ImageMediaSize;
  objectFit?: ImageMediaObjectFit;
  width?: number | null;
  height?: number | null;
  widthUnit?: ImageMediaDimensionUnit;
  heightUnit?: ImageMediaDimensionUnit;
  widthAuto?: boolean;
  heightAuto?: boolean;
};

export function ImageMediaRenderer({
  url,
  alt,
  lazyLoad = true,
  borderRadius,
  fill = false,
  className,
  hugOrAuthoredWidth = false,
  aspectRatio = "auto",
  size = "auto",
  objectFit = "cover",
  width = null,
  height = null,
  widthUnit = "px",
  heightUnit = "px",
  widthAuto = true,
  heightAuto = true,
}: Props) {
  if (!url) return null;

  const imageSrc = normalizeLocalMediaUrl(normalizeRemoteImageUrl(url) ?? url);
  const frameStyle: CSSProperties = {};
  if (borderRadius !== undefined) {
    frameStyle.borderRadius = typeof borderRadius === "number" ? `${borderRadius}px` : borderRadius;
  }

  const fitClass = objectFit === "contain" ? "object-contain" : "object-cover";
  const aspectClass = MEDIA_ASPECT_CLASS[aspectRatio];
  const sizeClass = size !== "auto" && size !== "custom" ? MEDIA_SIZE_CLASS[size] : "";
  const defaultMax =
    size === "auto"
      ? hugOrAuthoredWidth
        ? "max-w-full"
        : "max-w-4xl"
      : size === "full"
        ? "max-w-full"
        : "";
  const { width: explicitWidth, height: explicitHeight } = resolveCustomDimensionStyle({
    width,
    height,
    widthUnit,
    heightUnit,
    widthAuto,
    heightAuto,
    aspectRatio,
  });
  const hasCustomDimensions = size === "custom" || explicitWidth !== undefined || explicitHeight !== undefined;

  if (fill) {
    return (
      <div
        className={cn("absolute inset-0 overflow-hidden leading-none", className)}
        style={frameStyle}
        data-image-frame="true"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={imageSrc}
          alt={alt}
          className={cn("absolute inset-0 h-full w-full", fitClass)}
          loading={lazyLoad ? "lazy" : "eager"}
          decoding="async"
        />
      </div>
    );
  }

  const lockedAspect = aspectRatio !== "auto";

  return (
    <div
      className={cn(
        "relative w-full min-w-0 overflow-hidden leading-none",
        "mx-auto",
        size === "custom" ? "" : sizeClass || defaultMax,
        lockedAspect && aspectClass,
        borderRadius === undefined && "rounded-xl",
        className,
      )}
      style={
        hasCustomDimensions
          ? {
              ...frameStyle,
              ...(explicitWidth ? { width: explicitWidth } : {}),
              ...(explicitHeight ? { height: explicitHeight } : {}),
              ...(aspectRatio !== "auto" ? { aspectRatio: aspectRatio } : {}),
            }
          : frameStyle
      }
      data-image-frame="true"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={imageSrc}
        alt={alt}
        className={cn(
          lockedAspect ? cn("absolute inset-0 h-full w-full", fitClass) : "block h-auto w-full max-w-full",
        )}
        loading={lazyLoad ? "lazy" : "eager"}
        decoding="async"
      />
    </div>
  );
}
