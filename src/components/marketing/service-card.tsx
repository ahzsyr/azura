import {
  Bus,
  Car,
  Compass,
  Hotel,
  Plane,
  Shield,
} from "lucide-react";
import { Link } from "@/i18n/navigation";
import { DEFAULT_MEDIA_PLACEHOLDER } from "@/features/media/constants";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getLocalizedField } from "@/lib/utils";
import { CompareCardOverlay } from "@/features/comparison/components/compare-card-overlay";
import type { CompareCardProps } from "@/features/comparison/get-compare-props";
export type ServiceCardData = {
  id: string;
  type: string;
  titleEn: string;
  titleAr: string;
  descriptionEn: string;
  descriptionAr: string;
  icon: string;
};

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  bus: Bus,
  car: Car,
  compass: Compass,
  hotel: Hotel,
  plane: Plane,
  shield: Shield,
};

export function ServiceCard({
  service,
  locale,
  compare,
}: {
  service: ServiceCardData;
  locale: string;
  compare?: CompareCardProps;
}) {
  const Icon = iconMap[service.icon] ?? Compass;
  const title = getLocalizedField(service, "title", locale);
  const description = getLocalizedField(service, "description", locale);

  return (
    <Card className="relative h-full">
      {compare ? (
        <CompareCardOverlay
          contentTypeSlug={compare.contentTypeSlug}
          itemId={service.id}
          maxItems={compare.maxItems}
          label={compare.label}
          className="!absolute end-2 top-2 z-10"
        />
      ) : null}
      <CardHeader>
        <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Icon className="h-6 w-6" />
        </div>
        <CardTitle className="text-lg">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm leading-relaxed text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );
}

export function FeatureGrid({
  items,
}: {
  items: Array<{ title: string; desc: string }>;
}) {
  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
      {items.map((item) => (
        <div key={item.title} className="rounded-xl border border-border/60 bg-card p-6">
          <h3 className="font-heading text-lg font-semibold text-card-foreground">{item.title}</h3>
          <div className="gold-divider my-3" />
          <p className="text-sm leading-relaxed text-card-foreground/75">{item.desc}</p>
        </div>
      ))}
    </div>
  );
}

export function CTABanner({
  title,
  subtitle,
  buttonLabel,
  href,
}: {
  title: string;
  subtitle: string;
  buttonLabel: string;
  href: string;
}) {
  return (
    <div className="relative overflow-hidden rounded-2xl bg-primary px-8 py-16 text-center text-white md:px-16">
      <div
        className="absolute inset-0 bg-cover bg-center opacity-10"
        style={{ backgroundImage: `url('${DEFAULT_MEDIA_PLACEHOLDER}')` }}
      />
      <div className="relative">
        <h2 className="font-heading text-3xl font-semibold md:text-4xl">{title}</h2>
        <p className="mx-auto mt-4 max-w-xl text-white/85">{subtitle}</p>
        <Link
          href={href}
          className="mt-8 inline-flex h-12 items-center justify-center rounded-lg bg-accent px-8 text-sm font-medium text-accent-foreground transition hover:brightness-110"
        >
          {buttonLabel}
        </Link>
      </div>
    </div>
  );
}
