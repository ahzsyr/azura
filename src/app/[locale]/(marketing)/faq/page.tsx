import { getTranslations, setRequestLocale } from "next-intl/server";
import { PageHero, Section } from "@/components/marketing/section";
import { FaqSetGrid } from "@/components/marketing/faq-set-grid";
import { getFaqSets } from "@/lib/data";
import { seoService } from "@/features/seo/seo.service";
import type { Locale } from "@/i18n/routing";
import { getErrorMessage, isRecoverableDbError } from "@/lib/debug/recoverable-db-error";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props) {
  const { locale } = await params;
  try {
    const t = await getTranslations({ locale, namespace: "faq" });
    return seoService.resolveMetadata({
      locale: locale as Locale,
      path: "/faq",
      pageKey: "faq",
      fallback: { title: t("title"), description: t("subtitle") },
    });
  } catch (error) {
    console.error("[marketing/faq] metadata load failed:", getErrorMessage(error));
    return { title: "FAQ" };
  }
}

export default async function FaqIndexPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  try {
    const t = await getTranslations({ locale, namespace: "faq" });
    const faqSets = await getFaqSets();
    const grid = await FaqSetGrid({ faqSets, locale });

    return (
      <>
        <PageHero title={t("title")} subtitle={t("subtitle")} />
        <Section>{grid}</Section>
      </>
    );
  } catch (error) {
    const message = getErrorMessage(error);
    const digest = (error as { digest?: string })?.digest ?? null;
    console.error("[marketing/faq] render failed:", {
      message,
      digest,
      recoverable: isRecoverableDbError(error),
    });

    let title = "Frequently Asked Questions";
    let subtitle = "This page is temporarily unavailable. Please try again shortly.";
    try {
      const t = await getTranslations({ locale, namespace: "faq" });
      title = t("title");
      subtitle = t("subtitle");
    } catch {
      /* keep English fallbacks */
    }

    return (
      <>
        <PageHero title={title} subtitle={subtitle} />
        <Section>
          <div className="rounded-xl border border-dashed p-12 text-center text-muted-foreground">
            <p>This page is temporarily unavailable. Please try again shortly.</p>
          </div>
        </Section>
      </>
    );
  }
}
