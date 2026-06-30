"use client";

import type { CSSProperties } from "react";
import Link from "next/link";
import { ShowcaseLogoImage } from "@/features/builder/blocks/commerce/commerce-showcase/components/showcase-logo-image";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { CarouselApi } from "@/components/ui/carousel";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import {
  computeMarqueeRepeatCount,
  scrollDurationSec,
} from "@/features/announcement-bar/announcement-bar-utils";
import { cn } from "@/lib/utils";

export type BrandLogoItem = {
  id: string;
  imageUrl?: string;
  name: string;
  href: string;
};

type Props = {
  items: BrandLogoItem[];
  mode: "carousel" | "marquee";
  autoplay?: boolean;
  autoplayIntervalMs?: number;
  showArrows?: boolean;
  slidesPerView?: number;
  grayscale?: boolean;
  grayscaleHover?: boolean;
  logoSize?: "sm" | "md" | "lg";
  scrollSpeed?: "slow" | "medium" | "fast";
  scrollDirection?: "left" | "right";
  pauseOnHover?: boolean;
  showEdgeFade?: boolean;
  separator?: string;
  scrollSpeedCustom?: number;
};

const sizeClasses = {
  sm: "h-8 w-24",
  md: "h-12 w-32",
  lg: "h-16 w-40",
};

function BrandLogoCell({
  item,
  grayscale,
  grayscaleHover,
  logoSize,
}: {
  item: BrandLogoItem;
  grayscale: boolean;
  grayscaleHover: boolean;
  logoSize: "sm" | "md" | "lg";
}) {
  const inner = (
    <div
      className={cn(
        "relative mx-auto flex items-center justify-center",
        sizeClasses[logoSize],
        grayscale && "grayscale opacity-80",
        grayscaleHover && "transition-all hover:grayscale-0 hover:opacity-100",
      )}
    >
      {item.imageUrl ? (
        <ShowcaseLogoImage src={item.imageUrl} alt={item.name} fill sizes="128px" />
      ) : (
        <span className="text-xs font-medium text-muted-foreground">{item.name}</span>
      )}
    </div>
  );

  return (
    <Link href={item.href} className="block shrink-0">
      {inner}
    </Link>
  );
}

function BrandLogoCarousel({
  items,
  autoplay,
  autoplayIntervalMs,
  showArrows,
  slidesPerView,
  grayscale,
  grayscaleHover,
  logoSize,
}: Omit<Props, "mode" | "scrollSpeed" | "scrollDirection" | "pauseOnHover" | "showEdgeFade" | "separator" | "scrollSpeedCustom">) {
  const [api, setApi] = useState<CarouselApi>();
  const perView = slidesPerView ?? 4;
  const basis =
    perView >= 4
      ? "basis-full sm:basis-1/2 lg:basis-1/4"
      : perView === 3
        ? "basis-full sm:basis-1/2 lg:basis-1/3"
        : perView === 2
          ? "basis-full sm:basis-1/2"
          : "basis-full";

  useEffect(() => {
    if (!api || !autoplay) return;
    const interval = window.setInterval(() => {
      if (api.canScrollNext()) api.scrollNext();
      else api.scrollTo(0);
    }, autoplayIntervalMs ?? 5000);
    return () => window.clearInterval(interval);
  }, [api, autoplay, autoplayIntervalMs]);

  return (
    <Carousel setApi={setApi} opts={{ align: "start", loop: true }}>
      <CarouselContent className="-ml-4">
        {items.map((item) => (
          <CarouselItem key={item.id} className={cn("pl-4", basis)}>
            <BrandLogoCell
              item={item}
              grayscale={grayscale ?? true}
              grayscaleHover={grayscaleHover ?? true}
              logoSize={logoSize ?? "md"}
            />
          </CarouselItem>
        ))}
      </CarouselContent>
      {showArrows !== false ? (
        <>
          <CarouselPrevious className="hidden sm:flex" />
          <CarouselNext className="hidden sm:flex" />
        </>
      ) : null}
    </Carousel>
  );
}

function repeatBrandItems(items: BrandLogoItem[], times: number): BrandLogoItem[] {
  if (items.length === 0 || times <= 1) return items;
  return Array.from({ length: times }, () => items).flat();
}

function BrandLogoMarqueeChunk({
  chunkItems,
  sep,
  grayscale,
  grayscaleHover,
  logoSize,
  ariaHidden,
}: {
  chunkItems: BrandLogoItem[];
  sep: string;
  grayscale: boolean;
  grayscaleHover: boolean;
  logoSize: "sm" | "md" | "lg";
  ariaHidden?: boolean;
}) {
  return (
    <div
      className="az-brand-marquee__chunk flex shrink-0 items-center gap-12"
      aria-hidden={ariaHidden || undefined}
    >
      {chunkItems.map((item, i) => (
        <div key={`${item.id}-${i}`} className="flex shrink-0 items-center gap-12">
          <BrandLogoCell
            item={item}
            grayscale={grayscale}
            grayscaleHover={grayscaleHover}
            logoSize={logoSize}
          />
          {sep ? <span className="text-muted-foreground/50 text-sm select-none">{sep}</span> : null}
        </div>
      ))}
    </div>
  );
}

function BrandLogoMarquee({
  items,
  grayscale,
  grayscaleHover,
  logoSize,
  scrollSpeed,
  scrollDirection,
  pauseOnHover,
  showEdgeFade,
  separator,
  scrollSpeedCustom,
}: Omit<Props, "mode" | "autoplay" | "autoplayIntervalMs" | "showArrows" | "slidesPerView">) {
  const durationSec = scrollDurationSec(scrollSpeed ?? "medium", scrollSpeedCustom);
  const sep = separator?.trim() ? separator : "";
  const resolvedGrayscale = grayscale ?? true;
  const resolvedGrayscaleHover = grayscaleHover ?? true;
  const resolvedLogoSize = logoSize ?? "md";

  const viewportRef = useRef<HTMLDivElement>(null);
  const measureRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const [marqueeItems, setMarqueeItems] = useState(items);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  const cssVars = {
    ["--az-brand-marquee-dur" as string]: `${durationSec}s`,
  } as CSSProperties;

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setPrefersReducedMotion(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  useLayoutEffect(() => {
    if (prefersReducedMotion) {
      setMarqueeItems(items);
      return;
    }

    const viewport = viewportRef.current;
    const measure = measureRef.current;
    if (!viewport || !measure) return;

    const syncMarqueeItems = () => {
      const viewportWidth = viewport.clientWidth;
      const cycleWidth = measure.getBoundingClientRect().width;
      const repeatCount = computeMarqueeRepeatCount(cycleWidth, viewportWidth);
      const nextItems = repeatBrandItems(items, repeatCount);
      setMarqueeItems((current) =>
        current.length === nextItems.length &&
        current.every((item, index) => item.id === nextItems[index]?.id)
          ? current
          : nextItems,
      );
    };

    syncMarqueeItems();

    const ro = new ResizeObserver(syncMarqueeItems);
    ro.observe(viewport);
    ro.observe(measure);

    return () => ro.disconnect();
  }, [items, sep, resolvedLogoSize, resolvedGrayscale, resolvedGrayscaleHover, prefersReducedMotion]);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;

    const syncShift = () => {
      const chunk = track.querySelector<HTMLElement>(".az-brand-marquee__chunk");
      if (!chunk) return;
      const width = chunk.getBoundingClientRect().width;
      track.style.setProperty("--az-brand-marquee-shift", `-${width}px`);
    };

    syncShift();

    const chunk = track.querySelector<HTMLElement>(".az-brand-marquee__chunk");
    if (!chunk) return;

    const ro = new ResizeObserver(syncShift);
    ro.observe(chunk);

    void document.fonts?.ready.then(syncShift);

    return () => ro.disconnect();
  }, [marqueeItems, sep, resolvedLogoSize, resolvedGrayscale, resolvedGrayscaleHover]);

  const chunkProps = {
    sep,
    grayscale: resolvedGrayscale,
    grayscaleHover: resolvedGrayscaleHover,
    logoSize: resolvedLogoSize,
  };

  return (
    <div
      className={cn("az-brand-marquee", showEdgeFade !== false && "az-brand-marquee--fade")}
      style={cssVars}
      data-pause-hover={pauseOnHover !== false ? "true" : undefined}
    >
      <div ref={viewportRef} className="az-brand-marquee__viewport overflow-hidden">
        <div ref={measureRef} className="az-brand-marquee__measure" aria-hidden="true">
          <BrandLogoMarqueeChunk chunkItems={items} {...chunkProps} />
        </div>
        <div
          ref={trackRef}
          className={cn(
            "az-brand-marquee__track flex w-max items-center",
            scrollDirection === "right" && "az-brand-marquee__track--rtl",
          )}
        >
          <BrandLogoMarqueeChunk chunkItems={marqueeItems} {...chunkProps} />
          <BrandLogoMarqueeChunk chunkItems={marqueeItems} {...chunkProps} ariaHidden />
        </div>
      </div>
    </div>
  );
}

export function BrandLogoTrack(props: Props) {
  if (!props.items.length) return null;
  if (props.mode === "marquee") {
    return <BrandLogoMarquee {...props} />;
  }
  return <BrandLogoCarousel {...props} />;
}
