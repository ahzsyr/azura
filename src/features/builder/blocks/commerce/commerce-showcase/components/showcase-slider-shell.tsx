"use client";

import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { usePreferNativeSliderTrack } from "@/lib/hooks/use-prefer-native-slider-track";
import { peekCountAttr, responsivePeekBasis, sliderPeekOpts } from "@/features/builder/slider-peek";
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

  const basis = responsivePeekBasis(slidesPerView);

  if (preferNativeTrack) {
    return (
      <div className="block-overflow-slider-track" data-peek={peekCountAttr(slidesPerView)}>
        {items.map((item) => (
          <div
            key={item.key}
            className={cn("min-w-0 shrink-0", itemClassName)}
          >
            {item.node}
          </div>
        ))}
      </div>
    );
  }

  return (
    <Carousel opts={sliderPeekOpts} className="w-full">
      <CarouselContent className="-ms-3">
        {items.map((item) => (
          <CarouselItem key={item.key} className={cn("ps-3", basis, itemClassName)}>
            {item.node}
          </CarouselItem>
        ))}
      </CarouselContent>
      {showArrows && items.length > slidesPerView ? (
        <>
          <CarouselPrevious className="start-0" />
          <CarouselNext className="end-0" />
        </>
      ) : null}
    </Carousel>
  );
}
