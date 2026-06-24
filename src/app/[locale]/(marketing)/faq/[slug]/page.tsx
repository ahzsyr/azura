import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { ArrowLeft } from "lucide-react";
import { PageHero, Section } from "@/components/marketing/section";
import { FAQAccordion } from "@/components/marketing/faq-accordion";
import { getFaqSetBySlug } from "@/lib/data";
import { JsonLd, faqJsonLd } from "@/lib/seo";
import { seoService } from "@/features/seo/seo.service";
import { getLocalizedField } from "@/lib/utils";
import type { Locale } from "@/i18n/routing";

type Props = { params: Promise<{ locale: string; slug: string }> };

export async function generateMetadata({ params }: Props) {
  const { locale, slug } = await params;
  const faqSet = await getFaqSetBySlug(slug);
  if (!faqSet) return { title: "FAQ" };

  return seoService.resolveMetadata({
    locale: locale as Locale,
    path: `/faq/${slug}`,
    pageKey: "faq",
    fallback: {
      title: getLocalizedField(faqSet, "title", locale),
      description: getLocalizedField(faqSet, "excerpt", locale) || getLocalizedField(faqSet, "description", locale),
    },
  });
}

export default async function FaqSetPage({ params }: Props) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "faq" });
  const faqSet = await getFaqSetBySlug(slug);

  if (!faqSet) notFound();

  return (
    <>
      {faqSet.items.length > 0 && (
        <JsonLd
          data={faqJsonLd(
            faqSet.items.map((f) => ({
              question: getLocalizedField(f, "question", locale),
              answer: getLocalizedField(f, "answer", locale),
            }))
          )}
        />
      )}

      <PageHero
        title={getLocalizedField(faqSet, "title", locale)}
        subtitle={getLocalizedField(faqSet, "excerpt", locale) || t("subtitle")}
      />
      <Section>
        <Link
          href="/faq"
          className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          {t("backToFaq")}
        </Link>
        <div className="mx-auto max-w-3xl">
          <FAQAccordion faqs={faqSet.items} locale={locale} />
        </div>
      </Section>
    </>
  );
}
