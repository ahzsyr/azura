"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { HeroAtmosphere } from "@/components/marketing/hero-atmosphere";
import { BlockCtaButtons } from "@/features/builder/blocks/marketing/components/block-cta-buttons";
import type { VideoHeroSlide } from "@/features/builder/blocks/media/schemas/media-blocks";
import { VideoHeroSlideLayer } from "@/features/builder/blocks/media/components/video-hero-slide-layer";
import { resolveItemField } from "@/features/builder/blocks/marketing/lib/resolve-item-locale";
import { useConstrainedMotion } from "@/hooks/use-constrained-motion";
import { PUBLIC_MOTION, PUBLIC_MOTION_MOBILE } from "@/lib/motion/public-motion";
import { cn } from "@/lib/utils";

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
  fadeIntoSiteBackground?: boolean;
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
  fadeIntoSiteBackground = false,
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
  const osReduced = useReducedMotion();
  const { shouldReduceMotion, shouldSimplifyMotion } = useConstrainedMotion();
  const reduceMotion = Boolean(osReduced || shouldReduceMotion);
  const slideTransitionDuration = shouldSimplifyMotion
    ? PUBLIC_MOTION_MOBILE.revealDuration
    : 0.65;
  const hasMultipleSlides = activeSlides.length > 1;
  const slideLoop = hasMultipleSlides ? false : loop;

  useEffect(() => {
    if (slideIndex >= activeSlides.length) {
      setSlideIndex(0);
    }
  }, [activeSlides.length, slideIndex]);

  const goToNext = () => {
    setSlideIndex((i) => (i >= activeSlides.length - 1 ? 0 : i + 1));
  };

  useEffect(() => {
    if (!autoplaySlides || !hasMultipleSlides || reduceMotion) return;

    const slide = activeSlides[slideIndex];
    if (slide?.videoUrl) {
      // Video slides advance when the clip ends (see handleSlideEnded).
      return;
    }

    const t = window.setTimeout(() => {
      goToNext();
    }, autoplaySlideMs);

    return () => window.clearTimeout(t);
  }, [
    autoplaySlides,
    autoplaySlideMs,
    activeSlides,
    slideIndex,
    hasMultipleSlides,
    reduceMotion,
  ]);

  const handleSlideEnded = () => {
    if (autoplaySlides && hasMultipleSlides) {
      goToNext();
    }
  };

  const current = activeSlides[slideIndex] ?? activeSlides[0];
  const caption = current
    ? resolveItemField(current as Record<string, unknown>, "caption", locale)
    : "";
  const hasFilledBackground = Boolean(
    current?.videoUrl || current?.posterUrl || current?.imageUrl || posterUrl || videoUrl,
  );
  const fadeBg = fadeIntoSiteBackground && layout !== "split" && hasFilledBackground;
  // CSS mask-image on a <video> ancestor blanks playback on Safari macOS. Keep the
  // wash gradient fade; skip the mask whenever the active slide is a video.
  const activeHasVideo = Boolean(current?.videoUrl || (!hasMultipleSlides && videoUrl));
  const maskMediaIntoSite = fadeBg && !activeHasVideo;

  const alignClass =
    align === "left" ? "text-left items-start" : align === "right" ? "text-right items-end" : "text-center items-center";

  const goToSlide = (index: number) => {
    if (index < 0 || index >= activeSlides.length) return;
    setSlideIndex(index);
  };

  const goToPrevious = () => {
    setSlideIndex((i) => (i <= 0 ? activeSlides.length - 1 : i - 1));
  };

  const slideLayerProps = {
    fallbackPoster: posterUrl,
    captionTrackUrl,
    locale,
    autoplay,
    loop: slideLoop,
    muted,
    showControls,
    playsInline,
    reduceMotion,
    onEnded: hasMultipleSlides ? handleSlideEnded : undefined,
    transitionDuration: slideTransitionDuration,
    transitionEase: PUBLIC_MOTION.ease,
  };

  const mediaBg = (
    <div className={cn("absolute inset-0 -z-20 overflow-hidden", maskMediaIntoSite && "block-bg-fade-into-site")}>
      {hasMultipleSlides && !reduceMotion ? (
        <AnimatePresence mode="sync" initial={false}>
          {current ? (
            <VideoHeroSlideLayer
              key={current.id ?? slideIndex}
              slide={current as VideoHeroSlide & { id: string }}
              enableTransition
              {...slideLayerProps}
            />
          ) : null}
        </AnimatePresence>
      ) : current ? (
        <VideoHeroSlideLayer
          key={current.id ?? slideIndex}
          slide={current as VideoHeroSlide & { id: string }}
          {...slideLayerProps}
        />
      ) : null}
      <div
        className={cn("absolute inset-0 -z-10", overlayGradient ? "bg-gradient-to-t from-black/80 via-black/40 to-black/20" : "bg-black")}
        style={{ opacity: overlayOpacity / 100 }}
      />
    </div>
  );

  const captionBlock = caption ? (
    reduceMotion ? (
      <p className="mt-4 max-w-xl text-sm text-white/70">{caption}</p>
    ) : (
      <AnimatePresence mode="wait" initial={false}>
        <motion.p
          key={`${current?.id ?? slideIndex}-${caption}`}
          className="mt-4 max-w-xl text-sm text-white/70"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: slideTransitionDuration * 0.75, ease: PUBLIC_MOTION.ease }}
        >
          {caption}
        </motion.p>
      </AnimatePresence>
    )
  ) : null;

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
      {captionBlock}
    </>
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
      {fadeBg && <div className="block-bg-fade-into-site__wash" aria-hidden />}
      <div className={cn("container-premium relative z-10 flex min-h-[inherit] flex-col justify-center py-20", alignClass)}>
        {content}
        {hasMultipleSlides && showSlideDots && (
          <div className={cn("mt-8 flex gap-2", align === "center" && "justify-center")}>
            {activeSlides.map((s, i) => (
              <button
                key={s.id}
                type="button"
                aria-label={`Slide ${i + 1}`}
                aria-current={i === slideIndex ? "true" : undefined}
                className={cn(
                  "h-2 rounded-full transition-all duration-500 ease-out",
                  i === slideIndex ? "bg-accent w-6" : "w-2 bg-white/40 hover:bg-white/60",
                )}
                onClick={() => goToSlide(i)}
              />
            ))}
          </div>
        )}
      </div>
      {hasMultipleSlides && showSlideArrows && (
        <>
          <button
            type="button"
            className="absolute left-4 top-1/2 z-20 -translate-y-1/2 rounded-full bg-black/40 px-3 py-2 text-white transition-colors duration-300 hover:bg-black/60"
            onClick={goToPrevious}
            aria-label="Previous slide"
          >
            ‹
          </button>
          <button
            type="button"
            className="absolute right-4 top-1/2 z-20 -translate-y-1/2 rounded-full bg-black/40 px-3 py-2 text-white transition-colors duration-300 hover:bg-black/60"
            onClick={goToNext}
            aria-label="Next slide"
          >
            ›
          </button>
        </>
      )}
    </section>
  );
}
