import Image from "next/image";
import { cn } from "@/lib/utils";
import {
  clampOverlayOpacity,
  shouldShowBackgroundScrim,
} from "@/features/marketing-blocks/lib/background-scrim";

export { clampOverlayOpacity, shouldShowBackgroundScrim } from "@/features/marketing-blocks/lib/background-scrim";

type BackgroundProps = {
  backgroundType?: string;
  imageUrl?: string;
  videoUrl?: string;
  backgroundColor?: string;
  overlayOpacity?: number;
  imagePosition?: string;
  parallax?: boolean;
  priority?: boolean;
  className?: string;
  children?: React.ReactNode;
};

export function BlockBackgroundLayer({
  backgroundType = "gradient",
  imageUrl,
  videoUrl,
  backgroundColor,
  overlayOpacity = 60,
  imagePosition = "cover",
  parallax = false,
  priority = false,
  className,
  children,
}: BackgroundProps) {
  const isTransparent = backgroundType === "transparent" || backgroundType === "none";
  const hasImage = !isTransparent && backgroundType === "image" && Boolean(imageUrl);
  const hasVideo = !isTransparent && backgroundType === "video" && Boolean(videoUrl);
  const scrimOpacity = clampOverlayOpacity(overlayOpacity);
  const showScrim = shouldShowBackgroundScrim(backgroundType, {
    imageUrl,
    videoUrl,
    overlayOpacity: scrimOpacity,
  });

  return (
    <div className={cn("relative overflow-hidden", className)}>
      {hasImage && (
        <Image
          src={imageUrl!}
          alt=""
          fill
          className={cn(
            "absolute inset-0 z-0 object-cover",
            parallax && "parallax-bg",
            imagePosition === "contain" && "object-contain",
          )}
          sizes="100vw"
          priority={priority}
          loading={priority ? undefined : "lazy"}
        />
      )}
      {hasVideo && (
        <video
          autoPlay
          muted
          loop
          playsInline
          className="absolute inset-0 z-0 h-full w-full object-cover"
          src={videoUrl}
        />
      )}
      {backgroundType === "solid" && backgroundColor && (
        <div className="absolute inset-0 z-0" style={{ backgroundColor }} />
      )}
      {!isTransparent && backgroundType === "gradient" && (
        <div className="absolute inset-0 z-0 bg-gradient-to-br from-primary to-primary/80" />
      )}
      {showScrim && (
        <div
          className="absolute inset-0 z-[1] bg-black"
          style={{ opacity: scrimOpacity / 100 }}
          aria-hidden
        />
      )}
      <div className="relative z-[2]">{children}</div>
    </div>
  );
}
