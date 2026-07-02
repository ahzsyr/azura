"use client";

import Image from "next/image";
import Link from "next/link";
import { memo } from "react";
import { IMAGE_SIZES } from "@/lib/config/performance";
import { Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { CompareCardOverlay } from "@/features/comparison/components/compare-card-overlay";
import type { ContentPresetCardViewModel } from "@/view-models/content-preset-card";

type Props = {
  viewModel: ContentPresetCardViewModel;
  className?: string;
};

export const ContentPresetCardBody = memo(function ContentPresetCardBody({
  viewModel,
  className,
}: Props) {
  const {
    title,
    excerpt,
    href,
    imageUrl,
    imageAlt,
    isFeatured,
    collectionLabel,
    display,
    price,
    currency,
    duration,
    city,
    stars,
    compareContentTypeSlug,
    compareMaxItems,
    compareLabel,
    entityId,
  } = viewModel;

  const variant = display.cardVariant;
  const compare =
    compareContentTypeSlug && compareMaxItems
      ? {
          contentTypeSlug: compareContentTypeSlug,
          maxItems: compareMaxItems,
          label: compareLabel,
        }
      : undefined;

  const compareOverlay = compare ? (
    <CompareCardOverlay
      contentTypeSlug={compare.contentTypeSlug}
      itemId={entityId}
      maxItems={compare.maxItems}
      label={compare.label}
      className={!imageUrl ? "!absolute top-2 end-2 z-10" : undefined}
    />
  ) : null;

  return (
    <Card
      className={cn(
        "group relative overflow-hidden transition-shadow hover:shadow-md",
        variant === "featured" && "ring-2 ring-primary/20",
        variant === "minimal" && "border-0 shadow-none",
        className,
      )}
    >
      {compare && !imageUrl ? compareOverlay : null}
      <Link href={href} className="block">
        {imageUrl ? (
          <div
            className={cn(
              "relative bg-muted",
              variant === "compact" ? "aspect-[4/3]" : "aspect-video",
            )}
          >
            {compareOverlay}
            <Image
              src={imageUrl}
              alt={imageAlt}
              fill
              sizes={IMAGE_SIZES.card}
              loading="lazy"
              className="h-full w-full object-cover"
            />
            {display.showFeaturedBadge && isFeatured ? (
              <Badge className="absolute top-2 start-2 gap-1 text-[10px]">
                <Star className="h-3 w-3" />
                Featured
              </Badge>
            ) : null}
          </div>
        ) : null}

        <CardContent className={cn("p-4", variant === "compact" && "p-3")}>
          <div className="mb-1 flex flex-wrap items-center gap-2">
            {display.showCategory && collectionLabel ? (
              <Badge variant="outline" className="text-[10px]">
                {collectionLabel}
              </Badge>
            ) : null}
            {display.showCity && city ? (
              <Badge variant="secondary" className="text-[10px]">
                {city}
              </Badge>
            ) : null}
          </div>

          <h3
            className={cn(
              "line-clamp-2 font-semibold",
              variant === "compact" ? "text-sm" : "text-base",
            )}
          >
            {title}
          </h3>

          {display.showExcerpt && excerpt ? (
            <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{excerpt}</p>
          ) : null}

          <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
            {display.showPrice && price != null ? (
              <span className="font-medium text-primary">
                {currency ?? "USD"} {price}
              </span>
            ) : null}
            {display.showDuration && duration ? (
              <span className="text-muted-foreground">{duration} days</span>
            ) : null}
            {display.showStars && stars ? (
              <span className="text-amber-600" aria-label={`${stars} stars`}>
                {"★".repeat(Math.min(stars, 5))}
              </span>
            ) : null}
          </div>
        </CardContent>
      </Link>
    </Card>
  );
});
