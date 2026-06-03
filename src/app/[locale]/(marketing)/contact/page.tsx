import { getTranslations, setRequestLocale } from "next-intl/server";
import { seoService } from "@/features/seo/seo.service";
import type { Locale } from "@/i18n/routing";
import { MarketingCmsPage } from "@/features/cms/components/marketing-cms-page";
import { ContactStatic } from "./contact-static";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "contact" });
  return seoService.resolveMetadata({
    locale: locale as Locale,
    path: "/contact",
    pageKey: "contact",
    fallback: { title: t("title"), description: t("subtitle") },
  });
}

export default async function ContactPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <MarketingCmsPage
      slug="contact"
      locale={locale as Locale}
      fallback={<ContactStatic locale={locale} />}
    />
  );
}
