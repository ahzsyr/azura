import { getTranslations, setRequestLocale } from "next-intl/server";
import { seoService } from "@/features/seo/seo.service";
import type { Locale } from "@/i18n/routing";
import { MarketingCmsPage } from "@/features/cms/components/marketing-cms-page";
import { HotelsTransportStatic } from "./hotels-transport-static";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "hotels" });
  return seoService.resolveMetadata({
    locale: locale as Locale,
    path: "/hotels-transport",
    pageKey: "hotels-transport",
    fallback: { title: t("title"), description: t("subtitle") },
  });
}

export default async function HotelsTransportPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <MarketingCmsPage
      slug="hotels-transport"
      locale={locale as Locale}
      fallback={<HotelsTransportStatic locale={locale} />}
    />
  );
}
