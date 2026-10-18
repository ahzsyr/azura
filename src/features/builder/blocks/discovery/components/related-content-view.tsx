"use client";

import { ContentCard } from "@/components/content/content-card";
import type { ContentCardData } from "@/features/content/types";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { parseRelatedContentProps } from "@/features/builder/blocks/discovery/lib/parse-block-props";
import { mergeDisplaySettings, type DisplaySettings } from "@/schemas/content/display-settings";
import { cn } from "@/lib/utils";
import { responsivePeekBasis, sliderPeekOpts } from "@/features/builder/slider-peek";

type Props = {
  locale: string;
  items: ContentCardData[];
  blockProps: Record<string, unknown>;
};

export function RelatedContentView({ locale, items, blockProps: raw }: Props) {
  const p = parseRelatedContentProps(raw);
  const display: DisplaySettings = mergeDisplaySettings({
    cardVariant: p.cardVariant,
    columns: p.columns,
    layoutMode: p.layout === "list" ? "list" : "grid",
    limit: p.limit,
  });
  const columns = p.columns;
  const showArrows = p.showArrows !== false;

  if (!items.length) return null;

  if (p.layout === "carousel") {
    return (
      <Carousel opts={sliderPeekOpts} className="w-full">
        <CarouselContent className="-ms-4">
          {items.map((item) => (
            <CarouselItem key={item.id} className={cn("ps-4", responsivePeekBasis(columns))}>
              <ContentCard item={item} locale={locale} display={display} />
            </CarouselItem>
          ))}
        </CarouselContent>
        {showArrows ? (
          <>
            <CarouselPrevious className="hidden sm:flex" />
            <CarouselNext className="hidden sm:flex" />
          </>
        ) : null}
      </Carousel>
    );
  }

  if (p.layout === "list") {
    return (
      <ul className="space-y-4" role="list">
        {items.map((item) => (
          <li key={item.id}>
            <ContentCard item={item} locale={locale} display={display} />
          </li>
        ))}
      </ul>
    );
  }

  return (
    <div
      className={cn(
        "grid gap-6",
        columns === 2 && "md:grid-cols-2",
        columns === 3 && "md:grid-cols-2 lg:grid-cols-3",
        columns === 4 && "md:grid-cols-2 lg:grid-cols-4",
      )}
    >
      {items.map((item) => (
        <ContentCard key={item.id} item={item} locale={locale} display={display} />
      ))}
    </div>
  );
}
