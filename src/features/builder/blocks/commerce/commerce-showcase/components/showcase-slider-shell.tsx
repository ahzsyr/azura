"use client";

import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { usePreferNativeSliderTrack } from "@/lib/hooks/use-prefer-native-slider-track";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

type Props = {
  items: Array<{ key: string; node: ReactNode }>;
  slidesPerView?: number;
  autoplay?: boolean;
  showArrows?: boolean;
  showDots?: boolean;
  loop?: boolean;
  itemClassName?: string;
};

export function ShowcaseSliderShell({
  items,
  slidesPerView = 4,
  showArrows = true,
  itemClassName,
}: Props) {
  const preferNativeTrack = usePreferNativeSliderTrack();

  if (items.length === 0) return null;

  const basis =
    slidesPerView >= 4
      ? "basis-full sm:basis-1/2 lg:basis-1/4"
      : slidesPerView === 3
        ? "basis-full sm:basis-1/2 lg:basis-1/3"
        : slidesPerView === 2
          ? "basis-full sm:basis-1/2"
          : "basis-full";

  if (preferNativeTrack) {
    return (
      <div className="block-overflow-slider-track">
        {items.map((item) => (
          <div
            key={item.key}
            className={cn("min-w-[280px] max-w-sm shrink-0", itemClassName)}
          >
            {item.node}
          </div>
        ))}
      </div>
    );
  }

  return (
    <Carousel opts={{ align: "start", loop: items.length > slidesPerView }} className="w-full">
      <CarouselContent className="-ml-3">
        {items.map((item) => (
          <CarouselItem key={item.key} className={cn("pl-3", basis, itemClassName)}>
            {item.node}
          </CarouselItem>
        ))}
      </CarouselContent>
      {showArrows && items.length > slidesPerView ? (
        <>
          <CarouselPrevious className="left-0" />
          <CarouselNext className="right-0" />
        </>
      ) : null}
    </Carousel>
  );
}
