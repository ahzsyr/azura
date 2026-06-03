import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Locale } from "@/i18n/routing";
import { MarketingCmsPage } from "@/features/cms/components/marketing-cms-page";
import { seoService } from "@/features/seo/seo.service";
import { loadSiteBrandContext } from "@/lib/load-site-brand-context";
import { AboutStatic } from "./about-static";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props) {
  const { locale } = await params;
  const [t, { brandName }] = await Promise.all([
    getTranslations({ locale, namespace: "about" }),
    loadSiteBrandContext(),
  ]);
  return seoService.resolveMetadata({
    locale: locale as Locale,
    path: "/about",
    pageKey: "about",
    fallback: { title: t("title", { brandName }), description: t("story") },
  });
}

export default async function AboutPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <MarketingCmsPage
      slug="about"
      locale={locale as Locale}
      fallback={<AboutStatic locale={locale} />}
    />
  );
}
