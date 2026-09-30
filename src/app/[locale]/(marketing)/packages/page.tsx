import { setRequestLocale } from "next-intl/server";
import { MarketingCmsPage } from "@/features/cms/components/marketing-cms-page";
import { seoService } from "@/features/seo/seo.service";
import type { Locale } from "@/i18n/routing";

export const revalidate = 60;

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ category?: string }>;
};

export async function generateMetadata({ params }: Props) {
  const { locale } = await params;
  return seoService.resolveMetadata({
    locale: locale as Locale,
    path: "/packages",
    pageKey: "packages",
    fallback: { title: "", description: "" },
  });
}

export default async function PackagesPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  return <MarketingCmsPage slug="packages" locale={locale as Locale} />;
}
