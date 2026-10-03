"use client";

import { memo } from "react";
import type { ContentCardData } from "@/features/content/types";
import type { DisplaySettings } from "@/schemas/content/display-settings";
import type { PublicLocale } from "@/i18n/locale-config";
import type { EntityTranslation } from "@prisma/client";
import type { CompareCardProps as CompareListingProps } from "@/features/comparison/get-compare-props";
import type { ContentPresetCardViewModel } from "@/view-models/content-preset-card";
import { ContentPresetCardTemplate } from "@/templates/content-preset/content-preset-card-template";
import { getLocalizedField, cn } from "@/lib/utils";
import Image from "next/image";
import Link from "next/link";
import { IMAGE_SIZES } from "@/lib/config/performance";
import { Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { CompareCardOverlay } from "@/features/comparison/components/compare-card-overlay";

type Props = {
  item: ContentCardData;
  locale: string;
  display: DisplaySettings;
  className?: string;
  translations?: EntityTranslation[];
  enabledLocales?: PublicLocale[];
  defaultCode?: string;
  compare?: CompareListingProps;
  viewModel?: ContentPresetCardViewModel;
};

export const ContentCard = memo(function ContentCard(props: Props) {
  if (props.viewModel) {
    return (
      <ContentPresetCardTemplate viewModel={props.viewModel} locale={props.locale} className={props.className} />
    );
  }
  return <ContentCardLegacy {...props} />;
});

const ContentCardLegacy = memo(function ContentCardLegacy({
  item,
  locale,
  display,
  className,
  translations,
  enabledLocales,
  defaultCode,
  compare,
}: Omit<Props, "viewModel">) {
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

  if (
    variant === "modern-minimal" ||
    variant === "floating-premium" ||
    variant === "image-overlay"
  ) {
    const actionLabel = /^ar(?:-|$)/i.test(locale) ? "عرض التفاصيل" : "View Details";
    const action = (className: string) => (
      <Link href={href} className={className}>
        {actionLabel} <span aria-hidden="true">→</span>
      </Link>
    );
    const newStyle = variant;

    if (newStyle === "image-overlay") {
      return (
        <div className={cn("group relative isolate flex min-h-[22rem] h-full flex-col overflow-hidden rounded-2xl bg-slate-900 text-white", className)}>
          {image ? <Image src={image.url} alt={image.altEn ?? title} fill sizes={IMAGE_SIZES.card} className="z-0 object-cover transition-transform duration-500 group-hover:scale-105" /> : null}
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
      <div className={cn("group flex h-full flex-col overflow-visible rounded-2xl border border-slate-200/80 bg-white shadow-sm transition-shadow hover:shadow-lg", newStyle === "floating-premium" && "border-0 bg-transparent shadow-none hover:shadow-none", className)}>
        {image ? (
          <div className={cn("relative aspect-[4/3] overflow-hidden bg-muted", newStyle === "floating-premium" && "rounded-2xl")}>
            <Image src={image.url} alt={image.altEn ?? title} fill sizes={IMAGE_SIZES.card} className="object-cover transition-transform duration-500 group-hover:scale-105" />
            {compareOverlay}
          </div>
        ) : null}
        <div className={cn("relative flex flex-1 flex-col p-6", newStyle === "floating-premium" && "-mt-8 mx-3 rounded-2xl bg-white shadow-xl ring-1 ring-black/5")}>
          <h3 className="line-clamp-2 text-lg font-bold text-slate-900">{title}</h3>
          {display.showExcerpt && excerpt ? <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-slate-600">{excerpt}</p> : null}
          {action(newStyle === "floating-premium" ? "mt-4 inline-flex w-fit items-center gap-2 rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold text-white transition hover:bg-slate-700" : "mt-auto inline-flex w-fit items-center gap-1 pt-5 text-sm font-semibold text-slate-800 hover:text-primary")}
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
      {compare && !image ? compareOverlay : null}
      <Link href={href} className="block">
        {image ? (
          <div
            className={cn(
              "relative bg-muted",
              variant === "compact" ? "aspect-[4/3]" : "aspect-video",
            )}
          >
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
          <div className="mb-1 flex flex-wrap items-center gap-2">
            {display.showCategory && item.collection ? (
              <Badge variant="outline" className="text-[10px]">
                {getLocalizedField(
                  item.collection as Record<string, unknown>,
                  "name",
                  locale,
                  fieldOpts,
                )}
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
