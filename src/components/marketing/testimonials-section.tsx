"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { TestimonialCard, type TestimonialCardData } from "@/components/marketing/testimonial-card";
import type { TestimonialCardVariant } from "@/features/testimonials/types";
import type { BlockNode } from "@/types/builder";
import type { BlockOverflowContext } from "@/features/builder/components/marketing-items-overflow";
import { MarketingItemsOverflow } from "@/features/builder/components/marketing-items-overflow";
import { cn } from "@/lib/utils";

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
  block?: BlockNode;
  overflow?: BlockOverflowContext;
};

const columnClasses = {
  2: "md:grid-cols-2",
  3: "md:grid-cols-2 lg:grid-cols-3",
  4: "md:grid-cols-2 lg:grid-cols-4",
};

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
  block,
  overflow,
}: Props) {
  const t = useTranslations("testimonials");
  if (items.length === 0) return null;

  const useOverflow = Boolean(block && overflow);
  const useSlider = layoutMode === "slider" && sliderEnabled;

  return (
    <>
      {useOverflow && block && overflow ? (
        <MarketingItemsOverflow
          block={block}
          overflowFlags={overflow.flags}
          previewDevice={overflow.previewDevice}
          items={items}
          columns={columns}
          gridClassName={columnClasses[columns]}
          autoplay={autoplay}
          autoplayIntervalMs={autoplayIntervalMs}
          getItemKey={(item) => item.id}
          renderItem={(item) => (
            <TestimonialCard testimonial={item} locale={locale} variant={cardVariant} />
          )}
        />
      ) : useSlider ? (
        <MarketingItemsOverflow
          block={{
            id: "testimonials-fallback",
            type: "testimonials",
            props: { layoutMode, sliderEnabled },
          }}
          items={items}
          columns={columns}
          gridClassName={columnClasses[columns]}
          autoplay={autoplay}
          autoplayIntervalMs={autoplayIntervalMs}
          getItemKey={(item) => item.id}
          renderItem={(item) => (
            <TestimonialCard testimonial={item} locale={locale} variant={cardVariant} />
          )}
        />
      ) : (
        <div className={cn("grid gap-6", columnClasses[columns])}>
          {items.map((item) => (
            <TestimonialCard key={item.id} testimonial={item} locale={locale} variant={cardVariant} />
          ))}
        </div>
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

