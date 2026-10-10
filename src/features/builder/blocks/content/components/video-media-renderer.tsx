"use client";

import type { CSSProperties } from "react";
import { cn } from "@/lib/utils";
import { EmbedVideoPlayer } from "@/features/builder/blocks/media/components/embed-video-player";
import {
  MEDIA_SIZE_CLASS,
  mediaAspectFrame,
  resolveCustomDimensionStyle,
  type ImageMediaAspectRatio,
  type ImageMediaDimensionUnit,
  type ImageMediaObjectFit,
  type ImageMediaSize,
} from "@/features/builder/blocks/content/lib/image-block-model";

type Props = {
  url: string;
  title?: string;
  borderRadius?: string | number;
  fill?: boolean;
  className?: string;
  hugOrAuthoredWidth?: boolean;
  aspectRatio?: ImageMediaAspectRatio;
  customAspectWidth?: number | null;
  customAspectHeight?: number | null;
  size?: ImageMediaSize;
  objectFit?: ImageMediaObjectFit;
  controls?: boolean;
  autoplay?: boolean;
  width?: number | null;
  height?: number | null;
  widthUnit?: ImageMediaDimensionUnit;
  heightUnit?: ImageMediaDimensionUnit;
  widthAuto?: boolean;
  heightAuto?: boolean;
};

export function VideoMediaRenderer({
  url,
  title = "Video",
  borderRadius,
  fill = false,
  className,
  hugOrAuthoredWidth = false,
  aspectRatio = "16/9",
  customAspectWidth = null,
  customAspectHeight = null,
  size = "auto",
  objectFit = "cover",
  controls = true,
  autoplay = false,
  width = null,
  height = null,
  widthUnit = "px",
  heightUnit = "px",
  widthAuto = true,
  heightAuto = true,
}: Props) {
  if (!url) return null;

  const frameStyle: CSSProperties = {};
  if (borderRadius !== undefined) {
    frameStyle.borderRadius = typeof borderRadius === "number" ? `${borderRadius}px` : borderRadius;
  }

  const resolvedRatio = aspectRatio === "auto" ? "16/9" : aspectRatio;
  const aspect = mediaAspectFrame(resolvedRatio, customAspectWidth, customAspectHeight);
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
    aspectRatio: resolvedRatio,
    customAspectWidth,
    customAspectHeight,
  });
  const hasCustomDimensions = size === "custom" || explicitWidth !== undefined || explicitHeight !== undefined;

  if (fill) {
    return (
      <div
        className={cn("absolute inset-0 overflow-hidden bg-black leading-none", className)}
        style={frameStyle}
        data-video-frame="true"
      >
        <EmbedVideoPlayer
          url={url}
          title={title}
          controls={controls}
          autoplay={autoplay}
          objectFit={objectFit}
          className="absolute inset-0"
        />
      </div>
    );
  }

  return (
    <div
      className={cn(
        "relative w-full min-w-0 overflow-hidden bg-black leading-none",
        "mx-auto",
        size === "custom" ? "" : sizeClass || defaultMax,
        aspect.className,
        borderRadius === undefined && "rounded-xl",
        className,
      )}
      style={{
        ...frameStyle,
        ...(hasCustomDimensions && explicitWidth ? { width: explicitWidth } : {}),
        ...(hasCustomDimensions && explicitHeight ? { height: explicitHeight } : {}),
        ...aspect.style,
      }}
      data-video-frame="true"
    >
      <EmbedVideoPlayer
        url={url}
        title={title}
        controls={controls}
        autoplay={autoplay}
        objectFit={objectFit}
        className="absolute inset-0"
      />
    </div>
  );
}
