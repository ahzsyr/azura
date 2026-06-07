"use client";

import { parseEmbedUrl } from "@/features/media-blocks/lib/embed-video";
import { cn } from "@/lib/utils";

type Props = {
  url: string;
  title?: string;
  controls?: boolean;
  autoplay?: boolean;
  loop?: boolean;
  muted?: boolean;
  preload?: "none" | "metadata" | "auto";
  className?: string;
};

export function EmbedVideoPlayer({
  url,
  title = "Video",
  controls = true,
  autoplay = false,
  loop = false,
  muted = false,
  preload = "metadata",
  className,
}: Props) {
  const info = parseEmbedUrl(url);

  if (info.type === "youtube" || info.type === "vimeo") {
    const src = info.embedSrc ?? url;
    return (
      <iframe
        src={src}
        title={title}
        className={cn("h-full w-full border-0", className)}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
      />
    );
  }

  if (info.type === "file" && url) {
    return (
      <video
        src={url}
        title={title}
        controls={controls}
        autoPlay={autoplay}
        loop={loop}
        muted={muted}
        playsInline
        preload={preload}
        className={cn("h-full w-full object-cover", className)}
      />
    );
  }

  return (
    <div className={cn("flex h-full min-h-[120px] items-center justify-center bg-muted text-sm text-muted-foreground", className)}>
      No video URL
    </div>
  );
}
