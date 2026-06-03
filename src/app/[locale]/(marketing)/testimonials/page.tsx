import { getTranslations, setRequestLocale } from "next-intl/server";
import { seoService } from "@/features/seo/seo.service";
import type { Locale } from "@/i18n/routing";
import { MarketingCmsPage } from "@/features/cms/components/marketing-cms-page";
import { TestimonialsStatic } from "./testimonials-static";

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ collection?: string }>;
};

export async function generateMetadata({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "testimonials" });
  return seoService.resolveMetadata({
    locale: locale as Locale,
    path: "/testimonials",
    pageKey: "testimonials",
    fallback: { title: t("title"), description: t("subtitle") },
  });
}

export default async function TestimonialsPage({ params, searchParams }: Props) {
  const { locale } = await params;
  const { collection: collectionSlug } = await searchParams;
  setRequestLocale(locale);

  return (
    <MarketingCmsPage
      slug="testimonials"
      locale={locale as Locale}
      fallback={<TestimonialsStatic locale={locale} collectionSlug={collectionSlug} />}
    />
  );
}
