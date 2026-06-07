import Image from "next/image";
import { cn } from "@/lib/utils";

type BackgroundProps = {
  backgroundType?: string;
  imageUrl?: string;
  videoUrl?: string;
  backgroundColor?: string;
  overlayOpacity?: number;
  className?: string;
  children?: React.ReactNode;
};

export function BlockBackgroundLayer({
  backgroundType = "gradient",
  imageUrl,
  videoUrl,
  backgroundColor,
  overlayOpacity = 60,
  className,
  children,
}: BackgroundProps) {
  const isTransparent = backgroundType === "transparent" || backgroundType === "none";
  const hasImage = !isTransparent && backgroundType === "image" && Boolean(imageUrl);
  const hasVideo = !isTransparent && backgroundType === "video" && Boolean(videoUrl);

  return (
    <div className={cn("relative overflow-hidden", className)}>
      {hasImage && (
        <Image src={imageUrl!} alt="" fill className="object-cover -z-20" sizes="100vw" priority />
      )}
      {hasVideo && (
        <video
          autoPlay
          muted
          loop
          playsInline
          className="absolute inset-0 -z-20 h-full w-full object-cover"
          src={videoUrl}
        />
      )}
      {backgroundType === "solid" && backgroundColor && (
        <div className="absolute inset-0 -z-20" style={{ backgroundColor }} />
      )}
      {!isTransparent && backgroundType === "gradient" && (
        <div className="absolute inset-0 -z-20 bg-gradient-to-br from-primary to-primary/80" />
      )}
      {(hasImage || hasVideo) && (
        <div
          className="absolute inset-0 -z-10 bg-black"
          style={{ opacity: overlayOpacity / 100 }}
        />
      )}
      <div className="relative z-0">{children}</div>
    </div>
  );
}
