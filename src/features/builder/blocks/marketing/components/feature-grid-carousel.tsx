"use client";

import { Children, useEffect, useState, type ReactNode } from "react";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  type CarouselApi,
} from "@/components/ui/carousel";
import { cn } from "@/lib/utils";
import { peekBasis, sliderPeekOpts } from "@/features/builder/slider-peek";

function clampSlides(value: number) {
  return Math.min(6, Math.max(1, value));
}

type Props = {
  itemKey: string;
  cardsPerView: number;
  columns: number;
  columnsTablet: number;
  columnsMobile: number;
  gap: number;
  showNav: boolean;
  showDots: boolean;
  snap: boolean;
  autoplay: boolean;
  autoplayIntervalMs: number;
  children: ReactNode;
};

export function FeatureGridCarousel({
  itemKey,
  cardsPerView,
  columns,
  columnsTablet,
  columnsMobile,
  gap,
  showNav,
  showDots,
  snap,
  autoplay,
  autoplayIntervalMs,
  children,
}: Props) {
  const [api, setApi] = useState<CarouselApi>();
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [snapCount, setSnapCount] = useState(0);
  const [reduceMotion, setReduceMotion] = useState(false);

  const desktopSlides = cardsPerView > 1 ? cardsPerView : columns;
  const tabletSlides = cardsPerView > 1 ? Math.min(columnsTablet, cardsPerView) : columnsTablet;
  const mobileSlides = cardsPerView > 1 ? Math.min(columnsMobile, cardsPerView) : columnsMobile;

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReduceMotion(media.matches);
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    if (!api) return;
    const sync = () => {
      setSelectedIndex(api.selectedScrollSnap());
      setSnapCount(api.scrollSnapList().length);
    };
    sync();
    api.on("select", sync);
    api.on("reInit", sync);
    return () => {
      api.off("select", sync);
      api.off("reInit", sync);
    };
  }, [api]);

  useEffect(() => {
    if (!api || !autoplay || reduceMotion) return;
    const interval = window.setInterval(() => {
      if (api.canScrollNext()) api.scrollNext();
    }, autoplayIntervalMs);
    return () => window.clearInterval(interval);
  }, [api, autoplay, autoplayIntervalMs, reduceMotion]);

  const slides = Children.toArray(children);
  if (slides.length === 0) return null;

  return (
    <Carousel
      key={itemKey}
      setApi={setApi}
      opts={{ ...sliderPeekOpts, dragFree: !snap }}
      className={cn("w-full", showNav && "sm:px-10")}
    >
      <CarouselContent style={gap > 0 ? { marginLeft: -gap } : undefined}>
        {slides.map((child, index) => (
          <CarouselItem
            key={index}
            className={cn(
              "min-w-0",
              peekBasis(clampSlides(mobileSlides)),
              peekBasis(clampSlides(tabletSlides), "md"),
              peekBasis(clampSlides(desktopSlides), "lg"),
            )}
            style={gap > 0 ? { paddingLeft: gap } : undefined}
          >
            {child}
          </CarouselItem>
        ))}
      </CarouselContent>
      {showNav ? <CarouselPrevious /> : null}
      {showNav ? <CarouselNext /> : null}
      {showDots && snapCount > 1 ? (
        <div className="mt-4 flex justify-center gap-2">
          {Array.from({ length: snapCount }, (_, index) => (
            <button
              key={index}
              type="button"
              className={cn(
                "h-2 w-2 rounded-full",
                index === selectedIndex ? "bg-primary" : "bg-muted-foreground/40"
              )}
              aria-label={`Go to slide ${index + 1}`}
              aria-current={index === selectedIndex ? "true" : undefined}
              onClick={() => api?.scrollTo(index)}
            />
          ))}
        </div>
      ) : null}
    </Carousel>
  );
}
