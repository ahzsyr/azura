import { setRequestLocale } from "next-intl/server";
import { seoService } from "@/features/seo/seo.service";
import type { Locale } from "@/i18n/routing";
import { MarketingCmsPage } from "@/features/cms/components/marketing-cms-page";

export const revalidate = 60;

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props) {
  const { locale } = await params;
  return seoService.resolveMetadata({
    locale: locale as Locale,
    path: "/hotels-transport",
    pageKey: "hotels-transport",
    fallback: { title: "", description: "" },
  });
}

export default async function HotelsTransportPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  return <MarketingCmsPage slug="hotels-transport" locale={locale as Locale} />;
}
