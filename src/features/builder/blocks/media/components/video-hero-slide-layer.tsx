"use client";

import { useEffect, useLayoutEffect, useRef } from "react";
import Image from "next/image";
import type { VideoHeroSlide } from "@/features/builder/blocks/media/schemas/media-blocks";
import { cn } from "@/lib/utils";
import { getShortLanguageLocale } from "@/shared/layout/direction/direction-utils";

export type VideoHeroSlidePhase = "enter" | "active" | "exit";

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
  /** Crossfade phase — CSS opacity only (avoids Framer Motion on video ancestors). */
  phase?: VideoHeroSlidePhase;
  crossfadeMs?: number;
  transitionEaseCss?: string;
  zIndex?: number;
  /** Fires once when remaining playback time <= nearEndLeadMs (for gapless advance). */
  onNearEnd?: () => void;
  nearEndLeadMs?: number;
  onEnded?: () => void;
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
  phase = "active",
  crossfadeMs = 400,
  transitionEaseCss = "cubic-bezier(0.22, 1, 0.36, 1)",
  zIndex = 0,
  onNearEnd,
  nearEndLeadMs = 400,
  onEnded,
}: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const layerRef = useRef<HTMLDivElement>(null);
  const nearEndFiredRef = useRef(false);
  const enterStartedRef = useRef(false);
  const poster = slide.posterUrl || slide.imageUrl || fallbackPoster;
  const videoUrl = slide.videoUrl;
  const shouldAutoplay = autoplay && !reduceMotion;
  const shouldMute = muted || autoplay;
  const animate = !reduceMotion && crossfadeMs > 0;

  // Safari (esp. macOS) often ignores the autoPlay attribute after client mount /
  // slide remounts. Force muted + play() so hero clips start reliably.
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !videoUrl) return;

    video.defaultMuted = shouldMute;
    video.muted = shouldMute;
    video.playsInline = playsInline;
    nearEndFiredRef.current = false;

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

  // Drive opacity via CSS (not Framer Motion) so Safari still paints <video> frames.
  useLayoutEffect(() => {
    const el = layerRef.current;
    if (!el) return;

    if (!animate) {
      el.style.opacity = phase === "exit" ? "0" : "1";
      el.style.transition = "none";
      enterStartedRef.current = phase !== "exit";
      return;
    }

    el.style.transition = `opacity ${crossfadeMs}ms ${transitionEaseCss}`;

    if (phase === "exit") {
      el.style.opacity = "0";
      return;
    }

    if (!enterStartedRef.current) {
      enterStartedRef.current = true;
      if (phase === "enter") {
        el.style.opacity = "0";
        const frame = requestAnimationFrame(() => {
          el.style.opacity = "1";
        });
        return () => cancelAnimationFrame(frame);
      }
      el.style.opacity = "1";
    }
  }, [phase, animate, crossfadeMs, transitionEaseCss]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !videoUrl || !onNearEnd || phase === "exit") return;

    nearEndFiredRef.current = false;

    const maybeFireNearEnd = () => {
      if (nearEndFiredRef.current || !Number.isFinite(video.duration) || video.duration <= 0) {
        return;
      }
      const remainingMs = (video.duration - video.currentTime) * 1000;
      const lead = Math.min(nearEndLeadMs, (video.duration * 1000) / 2);
      if (remainingMs <= lead) {
        nearEndFiredRef.current = true;
        onNearEnd();
      }
    };

    video.addEventListener("timeupdate", maybeFireNearEnd);
    video.addEventListener("ended", maybeFireNearEnd);
    return () => {
      video.removeEventListener("timeupdate", maybeFireNearEnd);
      video.removeEventListener("ended", maybeFireNearEnd);
    };
  }, [videoUrl, onNearEnd, nearEndLeadMs, phase]);

  const isDecorative = !showControls;
  const media = reduceMotion && poster ? (
    <Image src={poster} alt="" fill className="object-cover" sizes="100vw" priority />
  ) : videoUrl ? (
    <video
      ref={videoRef}
      src={videoUrl}
      poster={isDecorative ? undefined : poster || undefined}
      autoPlay={shouldAutoplay}
      loop={loop}
      muted={shouldMute}
      playsInline={playsInline}
      preload="auto"
      onEnded={onEnded}
      aria-hidden={isDecorative ? true : undefined}
      {...(showControls ? { controls: true } : {})}
      className={cn("h-full w-full object-cover", !showControls && "pointer-events-none")}
    >
      {!isDecorative && captionTrackUrl ? (
        <track kind="captions" src={captionTrackUrl} srcLang={getShortLanguageLocale(locale)} />
      ) : null}
    </video>
  ) : poster ? (
    <Image src={poster} alt="" fill className="object-cover" sizes="100vw" priority />
  ) : null;

  return (
    <div
      ref={layerRef}
      className="absolute inset-0"
      style={{ zIndex, opacity: phase === "exit" || phase === "enter" ? 0 : 1 }}
      aria-hidden={phase === "exit" ? true : undefined}
    >
      {media}
    </div>
  );
}
