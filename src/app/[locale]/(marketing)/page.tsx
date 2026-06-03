import { setRequestLocale } from "next-intl/server";
import { getTranslations } from "next-intl/server";
import { seoService } from "@/features/seo/seo.service";
import type { Locale } from "@/i18n/routing";
import { MarketingCmsPage } from "@/features/cms/components/marketing-cms-page";
import { HomeStatic } from "@/components/marketing/home/home-static";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "hero" });
  return seoService.resolveMetadata({
    locale: locale as Locale,
    path: "",
    pageKey: "home",
    fallback: {
      title: "Premium Umrah & Islamic Travel",
      description: t("subtitle"),
    },
  });
}

export default async function HomePage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <MarketingCmsPage
      slug="home"
      locale={locale as Locale}
      fallback={<HomeStatic locale={locale} />}
    />
  );
}
