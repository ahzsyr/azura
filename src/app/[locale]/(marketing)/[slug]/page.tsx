import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { cmsService } from "@/features/cms/cms.service";
import { cmsRepository } from "@/repositories/cms.repository";
import { MarketingCmsPage } from "@/features/cms/components/marketing-cms-page";
import { ContentListPage } from "@/features/content/components/content-list-page";
import { contentPublicService } from "@/features/content/content-public.service";
import { getEnabledUrlPrefixes } from "@/i18n/locale-registry.server";
import { RESERVED_MARKETING_SLUGS, RESERVED_URL_PREFIXES } from "@/i18n/reserved-slugs";
import type { Locale } from "@/i18n/routing";
import { FALLBACK_LOCALES } from "@/i18n/locale-config";
import { seoService } from "@/features/seo/seo.service";
import { getLocalizedField } from "@/lib/utils";

/** Marketing routes with dedicated `page.tsx` files — never handled here. */
const RESERVED_SLUGS = RESERVED_MARKETING_SLUGS;

type Props = {
  params: Promise<{ locale: string; slug: string }>;
  searchParams: Promise<{ collection?: string }>;
};

export const revalidate = 60;
const FALLBACK_PREFIXES = FALLBACK_LOCALES.map((locale) => locale.urlPrefix);

export async function generateStaticParams() {
  try {
    await cmsService.processDueScheduled();
    const pages = await cmsRepository.publishedPageSlugs();
    let locales: string[] = [];
    try {
      locales = await getEnabledUrlPrefixes();
    } catch {
      locales = [...FALLBACK_PREFIXES];
    }
    if (locales.length === 0) locales = [...FALLBACK_PREFIXES];

    return locales.flatMap((locale) =>
      pages
        .filter((p) => !RESERVED_SLUGS.has(p.slug))
        .map((p) => ({ locale, slug: p.slug }))
    );
  } catch (error) {
    console.error("[MarketingSlugRoute] generateStaticParams failed:", error);
    return [];
  }
}

export async function generateMetadata({ params, searchParams }: Props) {
  const { locale, slug } = await params;
  const { collection } = await searchParams;

  if (RESERVED_SLUGS.has(slug)) return {};

  try {
    const resolution = await contentPublicService.resolveRoute([slug]);
    if (resolution.kind === "list") {
      const type = resolution.contentType;
      const path = collection ? `/${slug}?collection=${collection}` : `/${slug}`;
      const title = getLocalizedField(type, "name", locale);
      return seoService.resolveMetadata({
        locale: locale as Locale,
        path,
        fallback: { title, description: title },
      });
    }

    const page = await cmsService.getPublishedPageBySlug(slug);
    if (!page) return {};

    return seoService.resolveMetadata({
      locale: locale as Locale,
      cmsPageId: page.id,
      path: `/${slug}`,
    });
  } catch (error) {
    console.error(`[MarketingSlugRoute] generateMetadata failed for /${slug}:`, error);
    return {};
  }
}

/**
 * Single-segment resolver:
 * - Published CMS page → render at clean URL
 * - ContentType routePrefix → generic list page
 */
export default async function MarketingSlugRoute({ params, searchParams }: Props) {
  const { locale, slug } = await params;
  const { collection } = await searchParams;
  setRequestLocale(locale);

  if (RESERVED_SLUGS.has(slug) || RESERVED_URL_PREFIXES.has(slug)) {
    notFound();
  }

  try {
    const resolution = await contentPublicService.resolveRoute([slug]);
    if (resolution.kind === "list") {
      return (
        <ContentListPage
          locale={locale}
          contentType={resolution.contentType}
          collectionSlug={collection}
        />
      );
    }

    const page = await cmsService.getPublishedPageBySlug(slug);
    if (!page) {
      notFound();
    }

    return <MarketingCmsPage slug={slug} locale={locale as Locale} page={page} />;
  } catch (error) {
    console.error(`[MarketingSlugRoute] render failed for /${slug}:`, error);
    notFound();
  }
}
