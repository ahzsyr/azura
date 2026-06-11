"use client";

import Image from "next/image";
import Link from "next/link";
import { memo } from "react";
import { IMAGE_SIZES } from "@/lib/config/performance";
import { Star } from "lucide-react";
import type { ContentCardData } from "@/features/content/types";
import type { DisplaySettings } from "@/schemas/content/display-settings";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { getLocalizedField, cn } from "@/lib/utils";
import type { PublicLocale } from "@/i18n/locale-config";
import type { EntityTranslation } from "@prisma/client";
import { CompareCardOverlay } from "@/features/comparison/components/compare-card-overlay";
import type { CompareCardProps as CompareListingProps } from "@/features/comparison/get-compare-props";

type Props = {
  item: ContentCardData;
  locale: string;
  display: DisplaySettings;
  className?: string;
  translations?: EntityTranslation[];
  enabledLocales?: PublicLocale[];
  defaultCode?: string;
  compare?: CompareListingProps;
};

export const ContentCard = memo(function ContentCard({
  item,
  locale,
  display,
  className,
  translations,
  enabledLocales,
  defaultCode,
  compare,
}: Props) {
  const fieldOpts = { translations, enabledLocales, defaultCode };
  const title = getLocalizedField(item, "title", locale, fieldOpts);
  const excerpt = getLocalizedField(item, "excerpt", locale, fieldOpts);
  const attrs = item.attributes;
  const image = item.images[0];
  const href = item.href ?? "#";

  const price = attrs.price as string | number | undefined;
  const duration = attrs.duration as number | undefined;
  const city = attrs.city as string | undefined;
  const stars = attrs.stars as number | undefined;

  const variant = display.cardVariant;

  const compareOverlay = compare ? (
    <CompareCardOverlay
      contentTypeSlug={compare.contentTypeSlug}
      itemId={item.id}
      maxItems={compare.maxItems}
      label={compare.label}
      className={!image ? "!absolute top-2 end-2 z-10" : undefined}
    />
  ) : null;

  return (
    <Card
      className={cn(
        "group relative overflow-hidden transition-shadow hover:shadow-md",
        variant === "featured" && "ring-2 ring-primary/20",
        variant === "minimal" && "border-0 shadow-none",
        className
      )}
    >
      {compare && !image ? compareOverlay : null}
      <Link href={href} className="block">
        {image ? (
          <div className={cn("relative bg-muted", variant === "compact" ? "aspect-[4/3]" : "aspect-video")}>
            {compareOverlay}
            <Image
              src={image.url}
              alt={image.altEn ?? title}
              fill
              sizes={IMAGE_SIZES.card}
              loading="lazy"
              className="h-full w-full object-cover"
            />
            {display.showFeaturedBadge && item.isFeatured ? (
              <Badge className="absolute top-2 start-2 gap-1 text-[10px]">
                <Star className="h-3 w-3" />
                Featured
              </Badge>
            ) : null}
          </div>
        ) : null}

        <CardContent className={cn("p-4", variant === "compact" && "p-3")}>
          <div className="flex flex-wrap items-center gap-2 mb-1">
            {display.showCategory && item.collection ? (
              <Badge variant="outline" className="text-[10px]">
                {locale.startsWith("ar") ? item.collection.nameAr : item.collection.nameEn}
              </Badge>
            ) : null}
            {display.showCity && city ? (
              <Badge variant="secondary" className="text-[10px]">
                {city}
              </Badge>
            ) : null}
          </div>

          <h3 className={cn("font-semibold line-clamp-2", variant === "compact" ? "text-sm" : "text-base")}>
            {title}
          </h3>

          {display.showExcerpt && excerpt ? (
            <p className="mt-1 text-sm text-muted-foreground line-clamp-2">{excerpt}</p>
          ) : null}

          <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
            {display.showPrice && price != null ? (
              <span className="font-medium text-primary">
                {String(attrs.currency ?? "USD")} {price}
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
