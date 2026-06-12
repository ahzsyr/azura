"use client";

import type { CSSProperties } from "react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import type { CarouselApi } from "@/components/ui/carousel";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { scrollDurationSec } from "@/features/announcement-bar/announcement-bar-utils";
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
        <Image src={item.imageUrl} alt={item.name} fill className="object-contain" sizes="128px" />
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
  const doubled = [...items, ...items];

  const cssVars = {
    ["--az-brand-marquee-dur" as string]: `${durationSec}s`,
  } as CSSProperties;

  return (
    <div
      className={cn("az-brand-marquee", showEdgeFade !== false && "az-brand-marquee--fade")}
      style={cssVars}
      data-pause-hover={pauseOnHover !== false ? "true" : undefined}
    >
      <div className="az-brand-marquee__viewport overflow-hidden">
        <div
          className={cn(
            "az-brand-marquee__track flex w-max items-center gap-12",
            scrollDirection === "right" && "az-brand-marquee__track--rtl",
          )}
        >
          {doubled.map((item, i) => (
            <div key={`${item.id}-${i}`} className="flex shrink-0 items-center gap-12">
              <BrandLogoCell
                item={item}
                grayscale={grayscale ?? true}
                grayscaleHover={grayscaleHover ?? true}
                logoSize={logoSize ?? "md"}
              />
              {sep ? <span className="text-muted-foreground/50 text-sm select-none">{sep}</span> : null}
            </div>
          ))}
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
