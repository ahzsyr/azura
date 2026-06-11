import { setRequestLocale } from "next-intl/server";
import type { Locale } from "@/i18n/routing";
import { MarketingCmsPage } from "@/features/cms/components/marketing-cms-page";
import { cmsService } from "@/features/cms/cms.service";
import { seoService } from "@/features/seo/seo.service";

export const revalidate = 60;

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props) {
  const { locale } = await params;
  try {
    const page = await cmsService.getPublishedPageBySlug("why-choose-us");
    if (!page) return {};

    return seoService.resolveMetadata({
      locale: locale as Locale,
      path: "/why-choose-us",
      entityType: "CMS_PAGE",
      entityId: page.id,
      seoMeta: page.seoMeta,
      fallback: {
        title: page.titleEn || "Why Choose Us",
        description: page.excerptEn ?? "",
      },
    });
  } catch (error) {
    console.error("[WhyChooseUsPage] generateMetadata failed:", error);
    return {};
  }
}

export default async function WhyChooseUsPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  return <MarketingCmsPage slug="why-choose-us" locale={locale as Locale} />;
}
