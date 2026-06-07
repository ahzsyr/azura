import { OptimizedImage } from "@/components/ui/optimized-image";
import { IMAGE_SIZES } from "@/lib/config/performance";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Calendar, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { HoverCard } from "@/components/motion/lazy-motion";
import { formatPrice, getLocalizedField } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { DEFAULT_MEDIA_PLACEHOLDER } from "@/features/media/constants";
import { CompareCardOverlay } from "@/features/comparison/components/compare-card-overlay";
import type { CompareCardProps as CompareListingProps } from "@/features/comparison/get-compare-props";
export type PackageCardData = {
  id: string;
  slug: string;
  nameEn: string;
  nameAr: string;
  price: unknown;
  currency: string;
  duration: number;
  category: { id: string; slug: string; nameEn: string; nameAr: string };
  images: { url: string; altEn?: string; altAr?: string }[];
};

type PackageWithRelations = PackageCardData;

type PackageCardProps = {
  pkg: PackageWithRelations;
  locale: string;
  cardVariant?: "default" | "featured" | "minimal";
  compare?: CompareListingProps;
};

export function PackageCard({ pkg, locale, cardVariant = "default", compare }: PackageCardProps) {
  const t = useTranslations("packages");
  const name = getLocalizedField(pkg, "name", locale);
  const image = pkg.images[0]?.url ?? DEFAULT_MEDIA_PLACEHOLDER;
  const categoryName = getLocalizedField(pkg.category, "name", locale);

  return (
    <HoverCard>
      <Card
        className={cn(
          "az-card hover-lift hover-glow overflow-hidden",
          cardVariant === "featured" && "border-primary shadow-lg ring-1 ring-primary/20",
          cardVariant === "minimal" && "border-none shadow-none bg-transparent az-card"
        )}
      >
        <div className="relative aspect-[4/3] overflow-hidden">
          {compare ? (
            <CompareCardOverlay
              contentTypeSlug={compare.contentTypeSlug}
              itemId={pkg.id}
              maxItems={compare.maxItems}
              label={compare.label}
            />
          ) : null}
          <OptimizedImage
            src={image}
            alt={name}
            fill
            className="object-cover transition-transform duration-500 hover:scale-105"
            sizes={IMAGE_SIZES.card}
          />
          <Badge className="absolute start-4 top-4 bg-accent text-accent-foreground">{categoryName}</Badge>
        </div>
        <CardHeader>
          <CardTitle className="line-clamp-2">{name}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              {pkg.duration} {t("days")}
            </span>
            <span className="flex items-center gap-1">
              <MapPin className="h-4 w-4" />
              Makkah & Madinah
            </span>
          </div>
          <p className="text-2xl font-semibold text-primary">
            {t("from")} {formatPrice(Number(pkg.price), pkg.currency, locale)}
          </p>
        </CardContent>
        <CardFooter className="gap-2">
          <Button asChild className="flex-1">
            <Link href={`/packages/${pkg.slug}`}>{t("viewDetails")}</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href={`/contact?package=${pkg.slug}`}>{t("inquire")}</Link>
          </Button>
        </CardFooter>
      </Card>
    </HoverCard>
  );
}

export function PackageFilterBar({
  categories,
  activeSlug,
  locale,
}: {
  categories: PackageCardData["category"][];
  activeSlug?: string;
  locale: string;
}) {
  const t = useTranslations("packages");

  return (
    <div className="flex flex-wrap gap-2">
      <Link href="/packages">
        <Badge variant={!activeSlug ? "default" : "outline"} className="cursor-pointer px-4 py-2 text-sm">
          {t("all")}
        </Badge>
      </Link>
      {categories.map((cat) => (
        <Link key={cat.id} href={`/packages?category=${cat.slug}`}>
          <Badge
            variant={activeSlug === cat.slug ? "default" : "outline"}
            className="cursor-pointer px-4 py-2 text-sm"
          >
            {getLocalizedField(cat, "name", locale)}
          </Badge>
        </Link>
      ))}
    </div>
  );
}

export function StickyInquiryBar({ locale }: { locale: string }) {
  const t = useTranslations("packages");

  return (
    <div className="fixed bottom-0 start-0 end-0 z-40 border-t border-border bg-background/95 p-4 backdrop-blur md:hidden">
      <p className="mb-2 text-center text-sm text-muted-foreground">{t("stickyCta")}</p>
      <Button asChild className="w-full" variant="gold">
        <Link href="/contact">{t("inquire")}</Link>
      </Button>
    </div>
  );
}
