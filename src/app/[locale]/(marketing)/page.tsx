import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { isBuildWithoutDb } from "@/lib/build-db";
import { loadCachedHomePage } from "@/features/cms/load-home-page";
import { seoService } from "@/features/seo/seo.service";
import type { Locale } from "@/i18n/routing";
import { MarketingCmsPage } from "@/features/cms/components/marketing-cms-page";
import { loadPublicLocaleContext } from "@/features/i18n/public-locale-context";
import { translationService } from "@/features/translation/translation.service";
import { getLocalizedField } from "@/lib/utils";

/** ISR: serve cached home HTML; regen at most every 60s (avoids force-dynamic 504 on Hostinger). */
export const revalidate = 60;

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props) {
  const { locale } = await params;
  if (isBuildWithoutDb()) {
    return { title: "Home" };
  }

  const page = await loadCachedHomePage();
  if (!page) return {};
  const [localeCtx, translations] = await Promise.all([
    loadPublicLocaleContext(locale),
    translationService.getForEntity("CmsPage", page.id),
  ]);

  return seoService.resolveMetadata({
    locale: locale as Locale,
    path: "",
    entityType: "CMS_PAGE",
    entityId: page.id,
    seoMeta: page.seoMeta,
    fallback: {
      title:
        getLocalizedField(page, "title", locale, {
          enabledLocales: localeCtx.enabledLocales,
          defaultCode: localeCtx.defaultCode,
          translations,
        }) || "Home",
      description: getLocalizedField(page, "excerpt", locale, {
        enabledLocales: localeCtx.enabledLocales,
        defaultCode: localeCtx.defaultCode,
        translations,
      }),
    },
  });
}

export default async function HomePage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  if (isBuildWithoutDb()) {
    /** Empty shell at compile time — never bake demo landing template; ISR fills after deploy. */
    return <main className="min-h-[40vh]" aria-hidden="true" data-build-shell="true" />;
  }

  const page = await loadCachedHomePage();
  if (!page) notFound();

  return <MarketingCmsPage slug="home" locale={locale as Locale} page={page} />;
}
