import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { cmsService } from "@/features/cms/cms.service";
import { seoService } from "@/features/seo/seo.service";
import type { Locale } from "@/i18n/routing";
import { MarketingCmsPage } from "@/features/cms/components/marketing-cms-page";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props) {
  const { locale } = await params;
  const page =
    (await cmsService.getPublishedPageBySlug("home")) ??
    (await cmsService.resolveMarketingPage("home"));
  if (!page) return {};

  return seoService.resolveMetadata({
    locale: locale as Locale,
    path: "",
    entityType: "CMS_PAGE",
    entityId: page.id,
    seoMeta: page.seoMeta,
    fallback: {
      title: page.titleEn || "Home",
      description: page.excerptEn ?? "",
    },
  });
}

export default async function HomePage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const page =
    (await cmsService.getPublishedPageBySlug("home")) ??
    (await cmsService.resolveMarketingPage("home"));
  if (!page) notFound();

  return <MarketingCmsPage slug="home" locale={locale as Locale} page={page} />;
}
