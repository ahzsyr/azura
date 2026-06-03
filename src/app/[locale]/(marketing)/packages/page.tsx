import { getTranslations, setRequestLocale } from "next-intl/server";
import { ContentListPage } from "@/features/content/components/content-list-page";
import { MarketingCmsPage } from "@/features/cms/components/marketing-cms-page";
import { StickyInquiryBar } from "@/components/packages/package-card";
import { PackageComparisonTable } from "@/components/packages/package-comparison";
import { Section, SectionHeader } from "@/components/marketing/section";
import { AnimatedSection } from "@/components/motion/lazy-motion";
import { contentPublicService, toLegacyPackageView } from "@/features/content/content-public.service";
import { seoService } from "@/features/seo/seo.service";
import type { Locale } from "@/i18n/routing";

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ category?: string }>;
};

export async function generateMetadata({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "packages" });
  return seoService.resolveMetadata({
    locale: locale as Locale,
    path: "/packages",
    pageKey: "packages",
    fallback: { title: t("title"), description: t("subtitle") },
  });
}

export default async function PackagesPage({ params, searchParams }: Props) {
  const { locale } = await params;
  const { category } = await searchParams;
  setRequestLocale(locale);

  const t = await getTranslations({ locale, namespace: "packages" });
  await contentPublicService.ensureReady();
  const contentType = await contentPublicService.getTypeBySlug("catalog-items");
  if (!contentType) {
    return null;
  }

  const items = await contentPublicService.listItemsByTypeSlug("catalog-items", {
    collectionSlug: category,
  });
  const packages = items.map(toLegacyPackageView);

  const fallback = (
    <ContentListPage locale={locale} contentType={contentType} collectionSlug={category}>
      {packages.length >= 2 ? (
        <Section variant="muted">
          <SectionHeader title={t("compare")} />
          <AnimatedSection>
            <PackageComparisonTable packages={packages.slice(0, 4)} locale={locale} />
          </AnimatedSection>
        </Section>
      ) : null}
    </ContentListPage>
  );

  return (
    <>
      <MarketingCmsPage slug="packages" locale={locale as Locale} fallback={fallback} />
      <StickyInquiryBar locale={locale} />
    </>
  );
}
