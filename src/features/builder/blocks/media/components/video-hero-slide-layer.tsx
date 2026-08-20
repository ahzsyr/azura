"use client";

import { useEffect, useRef } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import type { VideoHeroSlide } from "@/features/builder/blocks/media/schemas/media-blocks";
import { cn } from "@/lib/utils";
import { getShortLanguageLocale } from "@/shared/layout/direction/direction-utils";

type Props = {
  slide: VideoHeroSlide & { id: string };
  fallbackPoster?: string;
  captionTrackUrl?: string;
  locale?: string;
  autoplay?: boolean;
  loop?: boolean;
  muted?: boolean;
  showControls?: boolean;
  playsInline?: boolean;
  reduceMotion?: boolean;
  enableTransition?: boolean;
  onEnded?: () => void;
  transitionDuration: number;
  transitionEase: readonly [number, number, number, number];
};

export function VideoHeroSlideLayer({
  slide,
  fallbackPoster = "",
  captionTrackUrl = "",
  locale = "en",
  autoplay = true,
  loop = true,
  muted = true,
  showControls = false,
  playsInline = true,
  reduceMotion = false,
  enableTransition = false,
  onEnded,
  transitionDuration,
  transitionEase,
}: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const poster = slide.posterUrl || slide.imageUrl || fallbackPoster;
  const videoUrl = slide.videoUrl;
  const shouldAutoplay = autoplay && !reduceMotion;
  const shouldMute = muted || autoplay;

  // Safari (esp. macOS) often ignores the autoPlay attribute after client mount /
  // slide remounts. Force muted + play() so hero clips start reliably.
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !videoUrl) return;

    video.defaultMuted = shouldMute;
    video.muted = shouldMute;
    video.playsInline = playsInline;

    if (shouldAutoplay) {
      const playAttempt = video.play();
      if (playAttempt && typeof playAttempt.catch === "function") {
        playAttempt.catch(() => {
          // Autoplay can still be blocked (e.g. Low Power Mode); poster remains.
        });
      }
    }

    return () => {
      video.pause();
    };
  }, [videoUrl, shouldAutoplay, shouldMute, playsInline]);

  const media = reduceMotion && poster ? (
    <Image src={poster} alt="" fill className="object-cover" sizes="100vw" priority />
  ) : videoUrl ? (
    <video
      ref={videoRef}
      src={videoUrl}
      poster={poster || undefined}
      autoPlay={shouldAutoplay}
      loop={loop}
      muted={shouldMute}
      playsInline={playsInline}
      preload="auto"
      onEnded={onEnded}
      {...(showControls ? { controls: true } : {})}
      className={cn("h-full w-full object-cover", !showControls && "pointer-events-none")}
    >
      {captionTrackUrl ? (
        <track kind="captions" src={captionTrackUrl} srcLang={getShortLanguageLocale(locale)} />
      ) : null}
    </video>
  ) : poster ? (
    <Image src={poster} alt="" fill className="object-cover" sizes="100vw" priority />
  ) : null;

  // Never put <video> under a Framer Motion opacity/transform layer.
  // Safari macOS frequently fails to paint video frames (or leaves the layer at
  // opacity 0) when the video's ancestor is animated — Chrome / iOS Safari usually OK.
  const animateLayer = Boolean(enableTransition && !reduceMotion && !videoUrl);

  if (!animateLayer) {
    return <div className="absolute inset-0">{media}</div>;
  }

  return (
    <motion.div
      className="absolute inset-0"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: transitionDuration, ease: transitionEase }}
    >
      {media}
    </motion.div>
  );
}
