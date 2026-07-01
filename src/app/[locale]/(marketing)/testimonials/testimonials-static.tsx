import { getTranslations } from "next-intl/server";
import { Star } from "lucide-react";
import { PageHero, Section } from "@/components/marketing/section";
import { TestimonialCard } from "@/components/marketing/testimonial-card";
import { getTestimonials, getTestimonialCollectionBySlug } from "@/lib/data";
import { JsonLd, reviewJsonLd } from "@/lib/seo";
import {
  loadEntityTranslations,
  loadPublicLocaleContext,
} from "@/features/i18n/public-locale-context";
import { getLocalizedField } from "@/lib/utils";

type Props = { locale: string; collectionSlug?: string };

export async function TestimonialsStatic({ locale, collectionSlug }: Props) {
  const [t, ctx, collection] = await Promise.all([
    getTranslations({ locale, namespace: "testimonials" }),
    loadPublicLocaleContext(locale),
    collectionSlug ? getTestimonialCollectionBySlug(collectionSlug) : Promise.resolve(null),
  ]);
  const collectionTranslations = collection
    ? await loadEntityTranslations("TestimonialCollection", collection.id)
    : [];
  const fieldOpts = {
    enabledLocales: ctx.enabledLocales,
    defaultCode: ctx.defaultCode,
    translations: collectionTranslations,
  };
  const testimonials = collection?.testimonials?.length
    ? collection.testimonials
    : await getTestimonials();

  const avgRating =
    testimonials.reduce((sum, item) => sum + item.rating, 0) / (testimonials.length || 1);

  return (
    <>
      <JsonLd
        data={reviewJsonLd(
          testimonials.map((item) => ({
            name: item.name,
            rating: item.rating,
            content: getLocalizedField(item, "content", locale),
          }))
        )}
      />

      <PageHero
        title={
          collection
            ? getLocalizedField(collection, "title", locale, fieldOpts)
            : t("title")
        }
        subtitle={
          collection
            ? getLocalizedField(collection, "excerpt", locale, fieldOpts) || t("subtitle")
            : t("subtitle")
        }
      />

      <Section>
        <div className="mb-12 flex flex-col items-center text-center">
          <div className="flex items-center gap-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star
                key={i}
                className={`h-6 w-6 ${i < Math.round(avgRating) ? "fill-accent text-accent" : "text-muted"}`}
              />
            ))}
          </div>
          <p className="mt-2 text-2xl font-semibold">{avgRating.toFixed(1)} / 5</p>
          <p className="text-sm text-muted-foreground">
            {testimonials.length} {t("reviews")}
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {testimonials.map((item) => (
            <TestimonialCard key={item.id} testimonial={item} locale={locale} />
          ))}
        </div>
      </Section>
    </>
  );
}
