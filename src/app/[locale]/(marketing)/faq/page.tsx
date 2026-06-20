import { getTranslations, setRequestLocale } from "next-intl/server";
import { PageHero, Section } from "@/components/marketing/section";
import { FaqSetGrid } from "@/components/marketing/faq-set-grid";
import { getFaqSets } from "@/lib/data";
import { seoService } from "@/features/seo/seo.service";
import type { Locale } from "@/i18n/routing";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "faq" });
  return seoService.resolveMetadata({
    locale: locale as Locale,
    path: "/faq",
    pageKey: "faq",
    fallback: { title: t("title"), description: t("subtitle") },
  });
}

export default async function FaqIndexPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "faq" });
  const faqSets = await getFaqSets();

  return (
    <>
      <PageHero title={t("title")} subtitle={t("subtitle")} />
      <Section>
        <FaqSetGrid faqSets={faqSets} locale={locale} />
      </Section>
    </>
  );
}
