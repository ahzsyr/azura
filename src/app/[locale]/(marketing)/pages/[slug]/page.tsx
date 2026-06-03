import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { getEnabledUrlPrefixes } from "@/i18n/locale-registry.server";
import type { Locale } from "@/i18n/routing";
import { routing } from "@/i18n/routing";
import { CmsPageRenderer } from "@/features/cms/components/cms-page-renderer";
import { cmsService } from "@/features/cms/cms.service";
import { cmsRepository } from "@/repositories/cms.repository";
import { seoService } from "@/features/seo/seo.service";
import { PageSeoJsonLd } from "@/features/seo/components/page-seo-jsonld";
import {
  loadPageTranslations,
  loadPublicLocaleContext,
} from "@/features/i18n/public-locale-context";
import { getLocalizedField } from "@/lib/utils";
import type { PageBlocks } from "@/types/builder";

export const revalidate = 60;

type Props = {
  params: Promise<{ locale: string; slug: string }>;
};

export async function generateStaticParams() {
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
    pages.map((p) => ({ locale, slug: p.slug }))
  );
}

export async function generateMetadata({ params }: Props) {
  const { locale, slug } = await params;
  const { languageCode } = await loadPublicLocaleContext(locale);
  const page = await cmsService.resolvePublishedPage(slug, languageCode);
  if (!page) return {};

  const { bundle, translations } = await loadPageTranslations(
    "CmsPage",
    page.id,
    (page.blocks as PageBlocks) ?? []
  );
  const fieldOpts = {
    enabledLocales: bundle.enabledLocales,
    defaultCode: bundle.defaultCode,
    translations,
  };

  return seoService.resolveMetadata({
    locale: locale as Locale,
    path: `/pages/${slug}`,
    entityType: "CMS_PAGE",
    entityId: page.id,
    seoMeta: page.seoMeta,
    fallback: {
      title: getLocalizedField(page, "title", locale, fieldOpts),
      description: getLocalizedField(page, "excerpt", locale, fieldOpts) ?? "",
    },
  });
}

export default async function CmsPageRoute({ params }: Props) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const { languageCode } = await loadPublicLocaleContext(locale);
  const page = await cmsService.resolvePublishedPage(slug, languageCode);
  if (!page) notFound();

  const { bundle, translations } = await loadPageTranslations(
    "CmsPage",
    page.id,
    (page.blocks as PageBlocks) ?? []
  );
  const fieldOpts = {
    enabledLocales: bundle.enabledLocales,
    defaultCode: bundle.defaultCode,
    translations,
  };
  const title = getLocalizedField(page, "title", locale, fieldOpts);
  const description = getLocalizedField(page, "excerpt", locale, fieldOpts) ?? "";

  return (
    <>
      <PageSeoJsonLd
        locale={locale as Locale}
        path={`/pages/${slug}`}
        entityType="CMS_PAGE"
        entityId={page.id}
        seoMeta={page.seoMeta}
        fallback={{ title, description }}
      />
      <CmsPageRenderer
        slug={slug}
        locale={locale as Locale}
        page={page}
        translationBundle={bundle}
        pageTranslations={translations}
      />
    </>
  );
}
