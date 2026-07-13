"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { HeroAtmosphere } from "@/components/marketing/hero-atmosphere";
import { BlockCtaButtons } from "@/features/builder/blocks/marketing/components/block-cta-buttons";
import type { VideoHeroSlide } from "@/features/builder/blocks/media/schemas/media-blocks";
import { resolveItemField } from "@/features/builder/blocks/marketing/lib/resolve-item-locale";
import { cn } from "@/lib/utils";
import { getShortLanguageLocale } from "@/shared/layout/direction/direction-utils";

type Props = {
  title: string;
  subtitle?: string;
  badge?: string;
  primaryCta?: { label: string; href: string };
  secondaryCta?: { label: string; href: string; variant?: "outline" | "ghost" | "gold" };
  mediaMode?: "single" | "featured";
  videoUrl?: string;
  posterUrl?: string;
  captionTrackUrl?: string;
  slides?: VideoHeroSlide[];
  layout?: "fullBleed" | "centered" | "split";
  align?: "left" | "center" | "right";
  minHeight?: string;
  autoplay?: boolean;
  loop?: boolean;
  muted?: boolean;
  showControls?: boolean;
  playsInline?: boolean;
  overlayOpacity?: number;
  overlayGradient?: boolean;
  autoplaySlides?: boolean;
  autoplaySlideMs?: number;
  showSlideDots?: boolean;
  showSlideArrows?: boolean;
  locale?: string;
  overlayClass?: string;
};

export function VideoHeroView({
  title,
  subtitle,
  badge,
  primaryCta,
  secondaryCta,
  mediaMode = "single",
  videoUrl = "",
  posterUrl = "",
  captionTrackUrl = "",
  slides = [],
  layout = "fullBleed",
  align = "center",
  minHeight = "70vh",
  autoplay = true,
  loop = true,
  muted = true,
  showControls = false,
  playsInline = true,
  overlayOpacity = 55,
  overlayGradient = true,
  autoplaySlides = true,
  autoplaySlideMs = 6000,
  showSlideDots = true,
  showSlideArrows = true,
  locale = "en",
  overlayClass,
}: Props) {
  const activeSlides = useMemo(() => {
    if (mediaMode === "featured" && slides.length > 0) return slides;
    if (videoUrl) {
      return [{ id: "single", videoUrl, imageUrl: posterUrl, posterUrl, captionEn: "", captionAr: "" }];
    }
    return [];
  }, [mediaMode, slides, videoUrl, posterUrl]);

  const [slideIndex, setSlideIndex] = useState(0);
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    setReduceMotion(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }, []);

  useEffect(() => {
    if (!autoplaySlides || activeSlides.length <= 1 || reduceMotion) return;
    const t = setInterval(() => {
      setSlideIndex((i) => (i + 1) % activeSlides.length);
    }, autoplaySlideMs);
    return () => clearInterval(t);
  }, [autoplaySlides, autoplaySlideMs, activeSlides.length, reduceMotion]);

  const current = activeSlides[slideIndex];
  const currentVideo = current?.videoUrl ?? videoUrl;
  const currentPoster = current?.posterUrl || current?.imageUrl || posterUrl;
  const caption = current
    ? resolveItemField(current as Record<string, unknown>, "caption", locale)
    : "";

  const alignClass =
    align === "left" ? "text-left items-start" : align === "right" ? "text-right items-end" : "text-center items-center";

  const content = (
    <>
      {badge && (
        <span className="az-hero-badge mb-6 text-xs font-medium uppercase tracking-wider text-accent">{badge}</span>
      )}
      <h1 className="font-heading text-4xl font-bold leading-tight md:text-5xl lg:text-6xl max-w-3xl" data-hero-title>
        {title}
      </h1>
      {subtitle && (
        <>
          <div className="gold-divider my-6" />
          <p className="max-w-xl text-lg text-white/85">{subtitle}</p>
        </>
      )}
      {(primaryCta?.label || secondaryCta?.label) && (
        <BlockCtaButtons
          primary={primaryCta ?? { label: "", href: "" }}
          secondary={secondaryCta}
          className={cn("mt-10", align === "center" && "justify-center", align === "right" && "justify-end")}
          dark
        />
      )}
      {caption && <p className="mt-4 max-w-xl text-sm text-white/70">{caption}</p>}
    </>
  );

  const mediaBg = (
    <div className="absolute inset-0 -z-20">
      {reduceMotion && currentPoster ? (
        <Image src={currentPoster} alt="" fill className="object-cover" sizes="100vw" priority />
      ) : currentVideo ? (
        <video
          key={currentVideo}
          src={currentVideo}
          poster={currentPoster || undefined}
          autoPlay={autoplay && !reduceMotion}
          loop={loop}
          muted={muted || autoplay}
          controls={showControls}
          playsInline={playsInline}
          className="h-full w-full object-cover"
        >
          {captionTrackUrl ? <track kind="captions" src={captionTrackUrl} srcLang={getShortLanguageLocale(locale)} /> : null}
        </video>
      ) : currentPoster ? (
        <Image src={currentPoster} alt="" fill className="object-cover" sizes="100vw" priority />
      ) : null}
      <div
        className={cn("absolute inset-0 -z-10", overlayGradient ? "bg-gradient-to-t from-black/80 via-black/40 to-black/20" : "bg-black")}
        style={{ opacity: overlayOpacity / 100 }}
      />
    </div>
  );

  if (layout === "split") {
    return (
      <section
        data-hero-layout={layout}
        className={cn("relative overflow-hidden", overlayClass)}
        style={{
          minHeight: overlayClass
            ? `calc(${minHeight} + var(--header-height, 76px) + var(--header-overlay-top-gap, 12px))`
            : minHeight,
        }}
      >
        <HeroAtmosphere showGlow />
        <div className="container-premium relative z-10 grid min-h-[inherit] items-center gap-8 py-20 lg:grid-cols-2">
          <div className={cn("flex flex-col", alignClass)}>{content}</div>
          <div className="relative aspect-video overflow-hidden rounded-2xl">{mediaBg}</div>
        </div>
      </section>
    );
  }

  return (
    <section
      data-hero-layout={layout}
      className={cn("relative overflow-hidden", overlayClass)}
      style={{
        minHeight: overlayClass
          ? `calc(${minHeight} + var(--header-height, 76px) + var(--header-overlay-top-gap, 12px))`
          : minHeight,
      }}
    >
      {mediaBg}
      <HeroAtmosphere showGlow />
      <div className={cn("container-premium relative z-10 flex min-h-[inherit] flex-col justify-center py-20", alignClass)}>
        {content}
        {activeSlides.length > 1 && showSlideDots && (
          <div className={cn("mt-8 flex gap-2", align === "center" && "justify-center")}>
            {activeSlides.map((s, i) => (
              <button
                key={s.id}
                type="button"
                aria-label={`Slide ${i + 1}`}
                className={cn("h-2 w-2 rounded-full transition", i === slideIndex ? "bg-accent w-6" : "bg-white/40")}
                onClick={() => setSlideIndex(i)}
              />
            ))}
          </div>
        )}
      </div>
      {activeSlides.length > 1 && showSlideArrows && (
        <>
          <button
            type="button"
            className="absolute left-4 top-1/2 z-20 -translate-y-1/2 rounded-full bg-black/40 px-3 py-2 text-white hover:bg-black/60"
            onClick={() => setSlideIndex((i) => (i <= 0 ? activeSlides.length - 1 : i - 1))}
            aria-label="Previous slide"
          >
            ‹
          </button>
          <button
            type="button"
            className="absolute right-4 top-1/2 z-20 -translate-y-1/2 rounded-full bg-black/40 px-3 py-2 text-white hover:bg-black/60"
            onClick={() => setSlideIndex((i) => (i >= activeSlides.length - 1 ? 0 : i + 1))}
            aria-label="Next slide"
          >
            ›
          </button>
        </>
      )}
    </section>
  );
}
