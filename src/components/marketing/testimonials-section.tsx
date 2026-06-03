"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import type { CarouselApi } from "@/components/ui/carousel";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { Button } from "@/components/ui/button";
import { TestimonialCard, type TestimonialCardData } from "@/components/marketing/testimonial-card";
import { cn } from "@/lib/utils";
import type { TestimonialCardVariant } from "@/features/testimonials/types";

type Props = {
  items: TestimonialCardData[];
  locale: string;
  columns?: 2 | 3 | 4;
  layoutMode?: "grid" | "slider";
  sliderEnabled?: boolean;
  cardVariant?: TestimonialCardVariant;
  autoplay?: boolean;
  autoplayIntervalMs?: number;
  showViewAllLink?: boolean;
};

const columnClasses = {
  2: "md:grid-cols-2",
  3: "md:grid-cols-2 lg:grid-cols-3",
  4: "md:grid-cols-2 lg:grid-cols-4",
};

function TestimonialsGrid({
  items,
  locale,
  columns = 3,
  cardVariant = "default",
}: Pick<Props, "items" | "locale" | "columns" | "cardVariant">) {
  return (
    <div className={cn("grid gap-6", columnClasses[columns])}>
      {items.map((item) => (
        <TestimonialCard key={item.id} testimonial={item} locale={locale} variant={cardVariant} />
      ))}
    </div>
  );
}

function TestimonialsSlider({
  items,
  locale,
  cardVariant = "default",
  autoplay = false,
  autoplayIntervalMs = 5000,
  slidesPerView = 1,
}: Pick<Props, "items" | "locale" | "cardVariant" | "autoplay" | "autoplayIntervalMs"> & {
  slidesPerView?: number;
}) {
  const [api, setApi] = useState<CarouselApi>();

  useEffect(() => {
    if (!api || !autoplay) return;
    const interval = window.setInterval(() => {
      if (api.canScrollNext()) api.scrollNext();
      else api.scrollTo(0);
    }, autoplayIntervalMs);
    return () => window.clearInterval(interval);
  }, [api, autoplay, autoplayIntervalMs]);

  const basis =
    slidesPerView >= 3
      ? "basis-full sm:basis-1/2 lg:basis-1/3"
      : slidesPerView === 2
        ? "basis-full sm:basis-1/2"
        : "basis-full";

  return (
    <Carousel
      setApi={setApi}
      opts={{ align: "start", loop: true }}
      className="mx-auto w-full max-w-6xl px-10"
    >
      <CarouselContent className="-ms-4">
        {items.map((item) => (
          <CarouselItem key={item.id} className={cn("ps-4", basis)}>
            <TestimonialCard testimonial={item} locale={locale} variant={cardVariant} />
          </CarouselItem>
        ))}
      </CarouselContent>
      <CarouselPrevious />
      <CarouselNext />
    </Carousel>
  );
}

export function TestimonialsSection({
  items,
  locale,
  columns = 3,
  layoutMode = "grid",
  sliderEnabled = false,
  cardVariant = "default",
  autoplay = false,
  autoplayIntervalMs = 5000,
  showViewAllLink = true,
}: Props) {
  const t = useTranslations("testimonials");
  if (items.length === 0) return null;

  const useSlider = layoutMode === "slider" && sliderEnabled;

  return (
    <>
      {useSlider ? (
        <TestimonialsSlider
          items={items}
          locale={locale}
          cardVariant={cardVariant}
          autoplay={autoplay}
          autoplayIntervalMs={autoplayIntervalMs}
          slidesPerView={columns}
        />
      ) : (
        <TestimonialsGrid items={items} locale={locale} columns={columns} cardVariant={cardVariant} />
      )}
      {showViewAllLink && (
        <div className="mt-8 text-center">
          <Button asChild variant="outline">
            <Link href="/testimonials">{t("viewAll")}</Link>
          </Button>
        </div>
      )}
    </>
  );
}
