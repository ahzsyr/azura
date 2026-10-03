import { OptimizedImage } from "@/components/ui/optimized-image";
import { IMAGE_SIZES } from "@/lib/config/performance";
import NextLink from "next/link";
import { Link as I18nLink } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { Calendar, MapPin, Star, Compass } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatPrice, getLocalizedField, type LocalizedFieldOptions } from "@/lib/utils";
import { resolveCatalogCardLocation } from "@/features/catalog/catalog-card-location";
import { DEFAULT_MEDIA_PLACEHOLDER } from "@/features/media/constants";
import type { CatalogCardData } from "@/features/catalog/types";
import type { DisplaySettings } from "@/schemas/catalog/display-settings";
import { cn } from "@/lib/utils";
import { CompareCardOverlay } from "@/features/comparison/components/compare-card-overlay";
import type { CompareCardProps as CompareListingProps } from "@/features/comparison/get-compare-props";
import { publicLocalePath } from "@/i18n/url-helpers";

type CatalogCardProps = {
  item: CatalogCardData;
  locale: string;
  displaySettings?: Partial<DisplaySettings>;
  /** Tailwind aspect-ratio class for cover image, e.g. "aspect-video" or "aspect-square". */
  imageAspectClass?: string;
  className?: string;
  /** Use locale-prefixed paths (admin preview). Default uses next-intl Link. */
  linkMode?: "i18n" | "locale-path";
  compare?: CompareListingProps;
};

export function CatalogCard({
  item,
  locale,
  displaySettings,
  imageAspectClass,
  className,
  linkMode = "i18n",
  compare,
}: CatalogCardProps) {
  const t = useTranslations("packages");
  const settings = {
    cardVariant: displaySettings?.cardVariant ?? "default",
    showPrice: displaySettings?.showPrice ?? true,
    showDuration: displaySettings?.showDuration ?? true,
    showCategory: displaySettings?.showCategory ?? true,
    showStars: displaySettings?.showStars ?? true,
    showCity: displaySettings?.showCity ?? true,
    showIcon: displaySettings?.showIcon ?? true,
    showExcerpt: displaySettings?.showExcerpt ?? true,
  };

  const localized: LocalizedFieldOptions = { includeLegacySuffixFields: true };
  const name =
    getLocalizedField(item, "name", locale, localized) ||
    getLocalizedField(item, "title", locale, localized);
  const excerpt =
    getLocalizedField(item, "excerpt", locale, localized) ||
    getLocalizedField(item, "description", locale, localized);
  const image = item.imageUrl || item.images[0]?.url || DEFAULT_MEDIA_PLACEHOLDER;
  const variant = settings.cardVariant;

  const cardClass = cn(
    "overflow-hidden h-full flex flex-col",
    variant === "featured" && "ring-2 ring-accent",
    variant === "minimal" && "border-0 shadow-none",
    variant === "compact" && "text-sm",
    className
  );

  const href = item.href || (item.slug ? `/${item.slug}` : "/");

  const resolvedHref =
    linkMode === "locale-path" ? publicLocalePath(locale, href) : href;
  const ctaLabel = t("viewDetails");
  const locationLabel = resolveCatalogCardLocation(item, locale);
  const showLocation = Boolean(locationLabel) && settings.showCity;
  const showDuration =
    item.source === "packages" && settings.showDuration && item.duration != null;

  const compareOverlay = compare ? (
    <CompareCardOverlay
      contentTypeSlug={compare.contentTypeSlug}
      itemId={item.id}
      maxItems={compare.maxItems}
      label={compare.label}
      className={variant === "minimal" ? "!absolute end-2 top-2 z-10" : undefined}
    />
  ) : null;

  const isModernStyle =
    variant === "modern-minimal" ||
    variant === "floating-premium" ||
    variant === "image-overlay";

  if (isModernStyle) {
    const detailAction = (className: string) =>
      linkMode === "locale-path" ? (
        <NextLink href={resolvedHref} className={className}>
          {ctaLabel} <span aria-hidden="true">→</span>
        </NextLink>
      ) : (
        <I18nLink href={href} className={className}>
          {ctaLabel} <span aria-hidden="true">→</span>
        </I18nLink>
      );

    if (variant === "image-overlay") {
      return (
        <Card className={cn("group relative isolate min-h-[22rem] h-full overflow-hidden rounded-2xl border-0 bg-slate-900 text-white shadow-sm", className)}>
          <OptimizedImage
            src={image}
            alt={name}
            fill
            className="z-0 object-cover transition-transform duration-500 group-hover:scale-105"
            sizes={IMAGE_SIZES.card}
          />
          <div className="absolute inset-0 z-10 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />
          {compareOverlay ? <div className="relative z-20">{compareOverlay}</div> : null}
          {item.source === "packages" && settings.showCategory && item.category ? (
            <Badge className="absolute start-4 top-4 bg-white/90 text-slate-900">
              {getLocalizedField(item.category, "name", locale, localized)}
            </Badge>
          ) : null}
          <div className="relative z-20 mt-auto flex min-h-[22rem] flex-col justify-end p-6">
            <h3 className="line-clamp-2 text-xl font-bold text-white">{name}</h3>
            {settings.showExcerpt && excerpt ? (
              <p className="mt-2 line-clamp-2 text-sm text-white/80">{excerpt}</p>
            ) : null}
            {detailAction("mt-4 inline-flex w-fit cursor-pointer items-center gap-1 text-sm font-semibold text-cyan-200 hover:text-white")}
          </div>
        </Card>
      );
    }

    return (
      <Card className={cn(
        "group h-full overflow-visible rounded-2xl border border-slate-200/80 bg-white shadow-sm transition-shadow hover:shadow-lg",
        variant === "floating-premium" && "border-0 bg-transparent shadow-none hover:shadow-none",
        className,
      )}>
        <div className={cn(
          "relative overflow-hidden bg-muted",
          imageAspectClass ?? "aspect-[4/3]",
          variant === "floating-premium" && "rounded-2xl",
        )}>
          <OptimizedImage
            src={image}
            alt={name}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-105"
            sizes={IMAGE_SIZES.card}
          />
          {compareOverlay}
        </div>
        <div className={cn(
          "relative flex flex-1 flex-col p-6",
          variant === "floating-premium" && "-mt-8 mx-3 rounded-2xl bg-white shadow-xl ring-1 ring-black/5",
        )}>
          <h3 className="line-clamp-2 text-lg font-bold text-slate-900">{name}</h3>
          {settings.showExcerpt && excerpt ? (
            <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-slate-600">{excerpt}</p>
          ) : null}
          {(showDuration || showLocation) ? (
            <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-slate-500">
              {showDuration ? <span>{item.duration} {t("days")}</span> : null}
              {showLocation ? <span>{locationLabel}</span> : null}
            </div>
          ) : null}
          {settings.showPrice && item.source === "packages" && item.price != null ? (
            <p className="mt-3 font-semibold text-slate-900">{t("from")} {formatPrice(Number(item.price), item.currency ?? "USD", locale)}</p>
          ) : null}
          {detailAction(variant === "floating-premium"
            ? "mt-4 inline-flex w-fit items-center gap-2 rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold text-white transition hover:bg-slate-700"
            : "mt-auto inline-flex w-fit items-center gap-1 pt-5 text-sm font-semibold text-slate-800 hover:text-primary")}
        </div>
      </Card>
    );
  }

  return (
    <Card className={cn(cardClass, compare && variant === "minimal" && "relative")}>
      {compare && variant === "minimal" ? compareOverlay : null}
      {variant !== "minimal" && (
        <div
          className={cn(
            "relative overflow-hidden bg-muted",
            imageAspectClass ?? (variant === "compact" ? "aspect-[16/9]" : "aspect-[4/3]")
          )}
        >
          {compareOverlay}
          <OptimizedImage
            src={image}
            alt={name}
            fill
            className="object-cover transition-transform duration-500 hover:scale-105"
            sizes={IMAGE_SIZES.card}
          />
          {item.source === "packages" && settings.showCategory && item.category && (
            <Badge className="absolute start-4 top-4 bg-accent text-accent-foreground">
              {getLocalizedField(item.category, "name", locale, localized)}
            </Badge>
          )}
          {item.source === "hotels" && settings.showStars && item.stars != null && (
            <Badge className="absolute start-4 top-4 bg-background/90">
              {Array.from({ length: item.stars }).map((_, i) => (
                <Star key={i} className="inline h-3 w-3 fill-accent text-accent" />
              ))}
            </Badge>
          )}
        </div>
      )}

      <CardHeader className={variant === "compact" ? "p-3 pb-0" : undefined}>
        <div className="flex items-start gap-2">
          {item.source === "services" && settings.showIcon && item.icon && variant === "minimal" && (
            <Compass className="mt-1 h-5 w-5 shrink-0 text-primary" />
          )}
          <CardTitle className={cn("line-clamp-2", variant === "compact" && "text-base")}>{name}</CardTitle>
        </div>
      </CardHeader>

      <CardContent className={cn("flex-1 space-y-2", variant === "compact" && "p-3 pt-2")}>
        {settings.showExcerpt && excerpt && variant !== "compact" && (
          <p className="line-clamp-3 text-sm text-muted-foreground">{excerpt}</p>
        )}

        {(showDuration || showLocation) && (
          <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
            {showDuration && (
              <span className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                {item.duration} {t("days")}
              </span>
            )}
            {showLocation && (
              <span className="flex items-center gap-1">
                <MapPin className="h-4 w-4" />
                {locationLabel}
              </span>
            )}
          </div>
        )}

        {item.source === "packages" && settings.showPrice && item.price != null && (
          <p className="text-xl font-semibold text-primary">
            {t("from")}{" "}
            {formatPrice(Number(item.price), item.currency ?? "USD", locale)}
          </p>
        )}
      </CardContent>

      {variant !== "minimal" && (
        <CardFooter className={cn("gap-2", variant === "compact" && "p-3 pt-0")}>
          <Button asChild className="flex-1" size={variant === "compact" ? "sm" : "default"}>
            {linkMode === "locale-path" ? (
              <NextLink href={resolvedHref}>{ctaLabel}</NextLink>
            ) : (
              <I18nLink href={href}>{ctaLabel}</I18nLink>
            )}
          </Button>
        </CardFooter>
      )}
    </Card>
  );
}

/** @deprecated Use CatalogCard with source packages */
export { CatalogCard as PackageCatalogCard };
