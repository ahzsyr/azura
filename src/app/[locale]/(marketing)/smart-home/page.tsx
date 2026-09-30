import { setRequestLocale } from "next-intl/server";
import type { Locale } from "@/i18n/routing";
import { MarketingCmsPage } from "@/features/cms/components/marketing-cms-page";
import { seoService } from "@/features/seo/seo.service";

export const revalidate = 60;

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props) {
  const { locale } = await params;
  return seoService.resolveMetadata({
    locale: locale as Locale,
    path: "/smart-home",
    pageKey: "smart-home",
    fallback: { title: "Smart Home", description: "" },
  });
}

export default async function SmartHomePage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  return <MarketingCmsPage slug="smart-home" locale={locale as Locale} />;
}
