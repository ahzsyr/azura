"use client";

import Image from "next/image";
import Link from "next/link";
import { memo } from "react";
import { IMAGE_SIZES } from "@/lib/config/performance";
import { Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { EntityCardViewModel } from "@/view-models/entity-card";

type Props = {
  viewModel: EntityCardViewModel;
  className?: string;
};

export const EntityCardBody = memo(function EntityCardBody({ viewModel, className }: Props) {
  const { title, excerpt, href, imageUrl, imageAlt, isFeatured, collectionLabel, display } =
    viewModel;
  const variant = display.cardVariant;

  return (
    <Card
      className={cn(
        "group relative overflow-hidden transition-shadow hover:shadow-md",
        variant === "featured" && "ring-2 ring-primary/20",
        variant === "minimal" && "border-0 shadow-none",
        className,
      )}
    >
      <Link href={href} className="block">
        {imageUrl ? (
          <div
            className={cn(
              "relative bg-muted",
              variant === "compact" ? "aspect-[4/3]" : "aspect-video",
            )}
          >
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
          {display.showCategory && collectionLabel ? (
            <Badge variant="outline" className="mb-1 text-[10px]">
              {collectionLabel}
            </Badge>
          ) : null}

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
        </CardContent>
      </Link>
    </Card>
  );
});
