import { setRequestLocale } from "next-intl/server";
import { seoService } from "@/features/seo/seo.service";
import type { Locale } from "@/i18n/routing";
import { MarketingCmsPage } from "@/features/cms/components/marketing-cms-page";

export const revalidate = 60;

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ collection?: string }>;
};

export async function generateMetadata({ params }: Props) {
  const { locale } = await params;
  return seoService.resolveMetadata({
    locale: locale as Locale,
    path: "/testimonials",
    pageKey: "testimonials",
    fallback: { title: "", description: "" },
  });
}

export default async function TestimonialsPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  return <MarketingCmsPage slug="testimonials" locale={locale as Locale} />;
}
