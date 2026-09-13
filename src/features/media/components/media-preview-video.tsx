"use client";

import { useEffect, useRef, useState } from "react";
import { Film } from "lucide-react";
import { normalizeLocalMediaUrl } from "@/lib/config/next-image";
import { cn } from "@/lib/utils";

type Props = {
  src: string;
  alt?: string;
  fill?: boolean;
  className?: string;
  controls?: boolean;
  showBadge?: boolean;
  onError?: () => void;
};

function captureFrame(video: HTMLVideoElement): string | null {
  if (!video.videoWidth || !video.videoHeight) return null;
  const canvas = document.createElement("canvas");
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
  try {
    return canvas.toDataURL("image/jpeg", 0.72);
  } catch {
    return null;
  }
}

function VideoBadge() {
  return (
    <span className="pointer-events-none absolute top-2 end-2 z-[1] rounded bg-black/70 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
      VIDEO
    </span>
  );
}

export function MediaPreviewVideo({
  src,
  alt = "",
  fill,
  className,
  controls = false,
  showBadge = false,
  onError,
}: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [failed, setFailed] = useState(false);
  const [poster, setPoster] = useState<string | null>(null);
  const normalized = normalizeLocalMediaUrl(src);

  useEffect(() => {
    setPoster(null);
    setFailed(false);
  }, [src]);

  const handleError = () => {
    setFailed(true);
    onError?.();
  };

  const handleLoadedMetadata = () => {
    const el = videoRef.current;
    if (!el || controls) return;
    const duration = Number.isFinite(el.duration) ? el.duration : 0;
    el.currentTime = duration > 0 ? Math.min(0.25, duration * 0.1) : 0.1;
  };

  const handleSeeked = () => {
    const el = videoRef.current;
    if (!el || controls) return;
    const frame = captureFrame(el);
    if (frame) setPoster(frame);
  };

  if (failed) {
    return (
      <div
        className={cn(
          "flex flex-col items-center justify-center gap-1 bg-muted text-muted-foreground",
          fill && "absolute inset-0 h-full w-full",
          className
        )}
      >
        <Film className="h-6 w-6" />
        <span className="text-[10px] font-medium uppercase">Video</span>
        {showBadge ? <VideoBadge /> : null}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "overflow-hidden bg-muted",
        fill ? "absolute inset-0" : "relative h-full w-full",
        className
      )}
    >
      {poster && !controls ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={poster}
          alt={alt}
          className="absolute inset-0 h-full w-full object-cover object-center"
        />
      ) : (
        <video
          ref={videoRef}
          src={normalized}
          muted={!controls}
          playsInline
          preload="auto"
          controls={controls}
          aria-label={alt}
          className={cn(
            "absolute inset-0 block h-full w-full min-h-full min-w-full",
            controls ? "object-contain bg-black" : "object-cover object-center pointer-events-none"
          )}
          onLoadedMetadata={handleLoadedMetadata}
          onSeeked={handleSeeked}
          onError={handleError}
        />
      )}
      {showBadge ? <VideoBadge /> : null}
    </div>
  );
}
