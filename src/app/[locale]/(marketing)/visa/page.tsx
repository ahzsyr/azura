import { getTranslations, setRequestLocale } from "next-intl/server";
import { seoService } from "@/features/seo/seo.service";
import type { Locale } from "@/i18n/routing";
import { MarketingCmsPage } from "@/features/cms/components/marketing-cms-page";
import { VisaStatic } from "./visa-static";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "visa" });
  return seoService.resolveMetadata({
    locale: locale as Locale,
    path: "/visa",
    pageKey: "visa",
    fallback: { title: t("title"), description: t("subtitle") },
  });
}

export default async function VisaPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <MarketingCmsPage
      slug="visa"
      locale={locale as Locale}
      fallback={<VisaStatic locale={locale} />}
    />
  );
}
