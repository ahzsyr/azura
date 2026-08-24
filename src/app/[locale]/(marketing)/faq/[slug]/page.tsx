import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { PageHero, Section } from "@/components/marketing/section";
import { FAQAccordion } from "@/components/marketing/faq-accordion";
import { getFaqSetBySlug } from "@/lib/data";
import { seoService } from "@/features/seo/seo.service";
import { getLocalizedField } from "@/lib/utils";
import { loadPageHeaderOverlay } from "@/features/builder/page-header-overlay.server";
import type { Locale } from "@/i18n/routing";

type Props = { params: Promise<{ locale: string; slug: string }> };

const localizedOpts = { includeLegacySuffixFields: true } as const;

export async function generateMetadata({ params }: Props) {
  const { locale, slug } = await params;
  const faqSet = await getFaqSetBySlug(slug);
  if (!faqSet) return { title: "FAQ" };

  return seoService.resolveMetadata({
    locale: locale as Locale,
    path: `/faq/${slug}`,
    fallback: {
      title: getLocalizedField(faqSet, "title", locale, localizedOpts),
      description:
        getLocalizedField(faqSet, "excerpt", locale, localizedOpts) ||
        getLocalizedField(faqSet, "description", locale, localizedOpts),
    },
  });
}

export default async function FaqSetPage({ params }: Props) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "faq" });
  const faqSet = await getFaqSetBySlug(slug);

  if (!faqSet) notFound();

  const hasUnderlay = Boolean(faqSet.coverUrl);
  const { dataAttributes: pageHeaderOverlayAttrs } = await loadPageHeaderOverlay(locale, [], {
    hasUnderlay,
  });

  return (
    <>
      <div className="page-top-header-overlay relative" {...pageHeaderOverlayAttrs}>
        <PageHero
          title={getLocalizedField(faqSet, "title", locale, localizedOpts)}
          subtitle={getLocalizedField(faqSet, "excerpt", locale, localizedOpts) || t("subtitle")}
          image={faqSet.coverUrl || undefined}
        />
      </div>
      <Section>
        <div className="mx-auto max-w-3xl">
          <FAQAccordion faqs={faqSet.items} locale={locale} />
        </div>
      </Section>
    </>
  );
}
