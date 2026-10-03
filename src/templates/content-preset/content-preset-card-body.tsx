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
  locale?: string;
  className?: string;
};

export const ContentPresetCardBody = memo(function ContentPresetCardBody({
  viewModel,
  locale = "en",
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

  if (
    display.cardVariant === "modern-minimal" ||
    display.cardVariant === "floating-premium" ||
    display.cardVariant === "image-overlay"
  ) {
    const actionLabel = /^ar(?:-|$)/i.test(locale) ? "عرض التفاصيل" : "View Details";
    const action = (className: string) => (
      <Link href={href} className={className}>
        {actionLabel} <span aria-hidden="true">→</span>
      </Link>
    );

    if (display.cardVariant === "image-overlay") {
      return (
        <div className={cn("group relative isolate flex min-h-[22rem] h-full flex-col overflow-hidden rounded-2xl bg-slate-900 text-white shadow-sm", className)}>
          {imageUrl ? (
            <Image src={imageUrl} alt={imageAlt} fill sizes={IMAGE_SIZES.card} loading="lazy" className="z-0 object-cover transition-transform duration-500 group-hover:scale-105" />
          ) : null}
          <div className="absolute inset-0 z-10 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />
          {compareOverlay ? <div className="relative z-20">{compareOverlay}</div> : null}
          <div className="relative z-20 mt-auto flex min-h-[22rem] flex-col justify-end p-6">
            <h3 className="line-clamp-2 text-xl font-bold text-white">{title}</h3>
            {display.showExcerpt && excerpt ? <p className="mt-2 line-clamp-2 text-sm text-white/80">{excerpt}</p> : null}
            {action("mt-4 inline-flex w-fit cursor-pointer items-center gap-1 text-sm font-semibold text-cyan-200 hover:text-white")}
          </div>
        </div>
      );
    }

    return (
      <div className={cn(
        "group flex h-full flex-col overflow-visible rounded-2xl border border-slate-200/80 bg-white shadow-sm transition-shadow hover:shadow-lg",
        display.cardVariant === "floating-premium" && "border-0 bg-transparent shadow-none hover:shadow-none",
        className,
      )}>
        {imageUrl ? (
          <div className={cn("relative aspect-[4/3] overflow-hidden bg-muted", display.cardVariant === "floating-premium" && "rounded-2xl")}>
            <Image src={imageUrl} alt={imageAlt} fill sizes={IMAGE_SIZES.card} loading="lazy" className="object-cover transition-transform duration-500 group-hover:scale-105" />
            {compareOverlay}
          </div>
        ) : null}
        <div className={cn(
          "relative flex flex-1 flex-col p-6",
          display.cardVariant === "floating-premium" && "-mt-8 mx-3 rounded-2xl bg-white shadow-xl ring-1 ring-black/5",
        )}>
          <h3 className="line-clamp-2 text-lg font-bold text-slate-900">{title}</h3>
          {display.showExcerpt && excerpt ? <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-slate-600">{excerpt}</p> : null}
          {display.showPrice && price != null ? <p className="mt-3 font-semibold text-slate-900">{currency ?? "USD"} {price}</p> : null}
          {action(display.cardVariant === "floating-premium"
            ? "mt-4 inline-flex w-fit items-center gap-2 rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold text-white transition hover:bg-slate-700"
            : "mt-auto inline-flex w-fit items-center gap-1 pt-5 text-sm font-semibold text-slate-800 hover:text-primary")}
        </div>
      </div>
    );
  }

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
