"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import type { CarouselApi } from "@/components/ui/carousel";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { cn } from "@/lib/utils";

export type LogoCarouselItem = {
  id: string;
  imageUrl: string;
  name: string;
  href?: string;
};

type Props = {
  items: LogoCarouselItem[];
  autoplay?: boolean;
  autoplayIntervalMs?: number;
  grayscale?: boolean;
  grayscaleHover?: boolean;
  logoSize?: "sm" | "md" | "lg";
  className?: string;
};

const sizeClasses = {
  sm: "h-8 w-24",
  md: "h-12 w-32",
  lg: "h-16 w-40",
};

function LogoImage({
  item,
  grayscale,
  grayscaleHover,
  logoSize,
}: {
  item: LogoCarouselItem;
  grayscale: boolean;
  grayscaleHover: boolean;
  logoSize: "sm" | "md" | "lg";
}) {
  const inner = (
    <div
      className={cn(
        "relative mx-auto flex items-center justify-center",
        sizeClasses[logoSize],
        grayscale && "grayscale",
        grayscaleHover && "transition-all hover:grayscale-0 hover:opacity-100 opacity-70"
      )}
    >
      {item.imageUrl ? (
        <Image src={item.imageUrl} alt={item.name} fill className="object-contain" sizes="128px" />
      ) : (
        <span className="text-xs text-muted-foreground">{item.name || "Logo"}</span>
      )}
    </div>
  );

  if (item.href) {
    return (
      <a href={item.href} target="_blank" rel="noopener noreferrer" className="block">
        {inner}
      </a>
    );
  }
  return inner;
}

export function LogoCarousel({
  items,
  autoplay = true,
  autoplayIntervalMs = 4000,
  grayscale = true,
  grayscaleHover = true,
  logoSize = "md",
  className,
}: Props) {
  const [api, setApi] = useState<CarouselApi>();

  useEffect(() => {
    if (!api || !autoplay) return;
    const interval = window.setInterval(() => {
      if (api.canScrollNext()) api.scrollNext();
      else api.scrollTo(0);
    }, autoplayIntervalMs);
    return () => window.clearInterval(interval);
  }, [api, autoplay, autoplayIntervalMs]);

  if (!items.length) return null;

  return (
    <Carousel setApi={setApi} opts={{ align: "start", loop: true }} className={className}>
      <CarouselContent className="-ml-4">
        {items.map((item) => (
          <CarouselItem key={item.id} className="basis-1/3 pl-4 sm:basis-1/4 md:basis-1/5 lg:basis-1/6">
            <LogoImage
              item={item}
              grayscale={grayscale}
              grayscaleHover={grayscaleHover}
              logoSize={logoSize}
            />
          </CarouselItem>
        ))}
      </CarouselContent>
      <CarouselPrevious className="hidden sm:flex" />
      <CarouselNext className="hidden sm:flex" />
    </Carousel>
  );
}

export function LogoMarquee({
  items,
  grayscale = true,
  grayscaleHover = true,
  logoSize = "md",
}: Omit<Props, "autoplay" | "autoplayIntervalMs" | "className">) {
  if (!items.length) return null;
  const doubled = [...items, ...items];

  return (
    <div className="overflow-hidden">
      <div className="flex animate-marquee gap-12 whitespace-nowrap">
        {doubled.map((item, i) => (
          <div key={`${item.id}-${i}`} className="shrink-0">
            <LogoImage
              item={item}
              grayscale={grayscale}
              grayscaleHover={grayscaleHover}
              logoSize={logoSize}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
