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
    path: "/security-solutions",
    pageKey: "security-solutions",
    fallback: { title: "Security Solutions", description: "" },
  });
}

export default async function SecuritySolutionsPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  return <MarketingCmsPage slug="security-solutions" locale={locale as Locale} />;
}
