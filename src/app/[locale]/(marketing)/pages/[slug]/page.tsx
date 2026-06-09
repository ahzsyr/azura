import { notFound, redirect } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { getEnabledUrlPrefixes } from "@/i18n/locale-registry.server";
import type { Locale } from "@/i18n/routing";
import { routing } from "@/i18n/routing";
import { MarketingCmsPage } from "@/features/cms/components/marketing-cms-page";
import { cmsService } from "@/features/cms/cms.service";
import { cmsRepository } from "@/repositories/cms.repository";
import { seoService } from "@/features/seo/seo.service";
import { CMS_WIRED_MARKETING_SLUGS } from "@/features/builder/constants";

export const revalidate = 60;

function wiredMarketingPath(locale: string, slug: string): string | null {
  const wired = CMS_WIRED_MARKETING_SLUGS[slug];
  if (!wired) return null;
  return wired === "/" ? `/${locale}` : `/${locale}${wired}`;
}

type Props = {
  params: Promise<{ locale: string; slug: string }>;
};

export async function generateStaticParams() {
  try {
    await cmsService.processDueScheduled();
    const pages = await cmsRepository.publishedPageSlugs();
    let locales: string[] = [];
    try {
      locales = await getEnabledUrlPrefixes();
    } catch {
      locales = [...routing.locales];
    }
    if (locales.length === 0) locales = [...routing.locales];

    return locales.flatMap((locale) =>
      pages
        .filter((p) => !CMS_WIRED_MARKETING_SLUGS[p.slug])
        .map((p) => ({ locale, slug: p.slug }))
    );
  } catch (error) {
    console.error("[CmsPageRoute] generateStaticParams failed:", error);
    return [];
  }
}

export async function generateMetadata({ params }: Props) {
  const { locale, slug } = await params;
  const canonicalPath = wiredMarketingPath(locale, slug);
  if (canonicalPath) {
    redirect(canonicalPath);
  }

  try {
    const page = await cmsService.getPublishedPageBySlug(slug);
    if (!page) return {};

    return seoService.resolveMetadata({
      locale: locale as Locale,
      path: `/pages/${slug}`,
      entityType: "CMS_PAGE",
      entityId: page.id,
      seoMeta: page.seoMeta,
      fallback: {
        title: page.titleEn,
        description: page.excerptEn ?? "",
      },
    });
  } catch (error) {
    console.error(`[CmsPageRoute] generateMetadata failed for /pages/${slug}:`, error);
    return {};
  }
}

export default async function CmsPageRoute({ params }: Props) {
  const { locale, slug } = await params;
  setRequestLocale(locale);

  const canonicalPath = wiredMarketingPath(locale, slug);
  if (canonicalPath) {
    redirect(canonicalPath);
  }

  try {
    const page = await cmsService.getPublishedPageBySlug(slug);
    if (!page) notFound();

    return <MarketingCmsPage slug={slug} locale={locale as Locale} page={page} />;
  } catch (error) {
    console.error(`[CmsPageRoute] render failed for /pages/${slug}:`, error);
    notFound();
  }
}
