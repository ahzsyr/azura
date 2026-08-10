import { OptimizedImage } from "@/components/ui/optimized-image";
import { normalizeLocalMediaUrl, normalizeRemoteImageUrl } from "@/lib/config/next-image";
import { cn } from "@/lib/utils";
import {
  clampOverlayOpacity,
  shouldShowBackgroundScrim,
} from "@/features/builder/blocks/marketing/lib/background-scrim";

export { clampOverlayOpacity, shouldShowBackgroundScrim } from "@/features/builder/blocks/marketing/lib/background-scrim";

type BackgroundProps = {
  backgroundType?: string;
  imageUrl?: string;
  videoUrl?: string;
  backgroundColor?: string;
  overlayOpacity?: number;
  /** Fade media/solid/gradient into the site page background at the bottom */
  fadeIntoSiteBackground?: boolean;
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
  fadeIntoSiteBackground = false,
  imagePosition = "cover",
  parallax = false,
  priority = false,
  className,
  children,
}: BackgroundProps) {
  const isTransparent = backgroundType === "transparent" || backgroundType === "none";
  const hasImage = !isTransparent && backgroundType === "image" && Boolean(imageUrl);
  const hasVideo = !isTransparent && backgroundType === "video" && Boolean(videoUrl);
  const hasSolid = !isTransparent && backgroundType === "solid" && Boolean(backgroundColor);
  const hasGradient = !isTransparent && backgroundType === "gradient";
  const hasFill = hasImage || hasVideo || hasSolid || hasGradient;
  const scrimOpacity = clampOverlayOpacity(overlayOpacity);
  const showScrim = shouldShowBackgroundScrim(backgroundType, {
    imageUrl,
    videoUrl,
    overlayOpacity: scrimOpacity,
  });
  const fadeEnabled = fadeIntoSiteBackground && hasFill;

  const media = (
    <>
      {hasImage && (
        <OptimizedImage
          src={normalizeLocalMediaUrl(normalizeRemoteImageUrl(imageUrl!) ?? imageUrl!)}
          alt=""
          fill
          skipFade
          className={cn(
            "absolute inset-0 z-0 object-cover",
            parallax && "parallax-bg",
            imagePosition === "contain" && "object-contain",
          )}
          sizes="100vw"
          priority={priority || undefined}
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
      {hasSolid && (
        <div className="absolute inset-0 z-0" style={{ backgroundColor }} />
      )}
      {hasGradient && (
        <div className="absolute inset-0 z-0 bg-gradient-to-br from-primary to-primary/80" />
      )}
      {showScrim && (
        <div
          className="absolute inset-0 z-[1] bg-black"
          style={{ opacity: scrimOpacity / 100 }}
          aria-hidden
        />
      )}
    </>
  );

  return (
    <div className={cn("relative overflow-hidden", className)}>
      {fadeEnabled ? (
        <div className="block-bg-fade-into-site absolute inset-0 z-0" aria-hidden>
          {media}
        </div>
      ) : (
        media
      )}
      <div className="relative z-[2]">{children}</div>
    </div>
  );
}
