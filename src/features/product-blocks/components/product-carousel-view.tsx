"use client";

import { useEffect, useState } from "react";
import type { CarouselApi } from "@/components/ui/carousel";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { ProductListingCard } from "@/features/products/components/listing/product-listing-card";
import type { ProductListingRecord } from "@/features/products/listing/types";
import { cn } from "@/lib/utils";

type Props = {
  products: ProductListingRecord[];
  localePrefix: string;
  numberLocale?: string;
  autoplay?: boolean;
  autoplayIntervalMs?: number;
  showArrows?: boolean;
  showDots?: boolean;
  loop?: boolean;
  slidesPerView?: number;
  className?: string;
};

export function ProductCarouselView({
  products,
  localePrefix,
  numberLocale = "en-US",
  autoplay = false,
  autoplayIntervalMs = 5000,
  showArrows = true,
  showDots = false,
  loop = true,
  slidesPerView = 3,
  className,
}: Props) {
  const [api, setApi] = useState<CarouselApi>();
  const [current, setCurrent] = useState(0);
  const [count, setCount] = useState(0);
  const prefix = localePrefix.replace(/^\/+|\/+$/g, "");
  const basis =
    slidesPerView >= 4
      ? "basis-full sm:basis-1/2 lg:basis-1/4"
      : slidesPerView === 3
        ? "basis-full sm:basis-1/2 lg:basis-1/3"
        : slidesPerView === 2
          ? "basis-full sm:basis-1/2"
          : "basis-full";

  useEffect(() => {
    if (!api) return;
    setCount(api.scrollSnapList().length);
    setCurrent(api.selectedScrollSnap());
    const onSelect = () => setCurrent(api.selectedScrollSnap());
    api.on("select", onSelect);
    return () => {
      api.off("select", onSelect);
    };
  }, [api]);

  useEffect(() => {
    if (!api || !autoplay) return;
    const id = window.setInterval(() => {
      if (api.canScrollNext()) api.scrollNext();
      else if (loop) api.scrollTo(0);
    }, autoplayIntervalMs);
    return () => window.clearInterval(id);
  }, [api, autoplay, autoplayIntervalMs, loop]);

  if (products.length === 0) return null;

  return (
    <div className={cn("relative", className)}>
      <Carousel setApi={setApi} opts={{ loop, align: "start" }} className="w-full">
        <CarouselContent className="-ms-2 md:-ms-4">
          {products.map((product, i) => (
            <CarouselItem key={product.slug} className={cn("ps-2 md:ps-4", basis)}>
              <ProductListingCard
                product={product}
                href={`/${prefix}/products/${product.slug}`}
                numberLocale={numberLocale}
                priority={i < 2}
              />
            </CarouselItem>
          ))}
        </CarouselContent>
        {showArrows && products.length > 1 ? (
          <>
            <CarouselPrevious className="hidden sm:flex" />
            <CarouselNext className="hidden sm:flex" />
          </>
        ) : null}
      </Carousel>
      {showDots && count > 1 ? (
        <div className="flex justify-center gap-1.5 mt-4">
          {Array.from({ length: count }).map((_, i) => (
            <button
              key={i}
              type="button"
              aria-label={`Slide ${i + 1}`}
              className={cn(
                "h-2 w-2 rounded-full transition",
                i === current ? "bg-primary" : "bg-muted-foreground/30",
              )}
              onClick={() => api?.scrollTo(i)}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
