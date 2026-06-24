import { setRequestLocale } from "next-intl/server";
import type { Locale } from "@/i18n/routing";
import { MarketingCmsPage } from "@/features/cms/components/marketing-cms-page";
import { cmsService } from "@/features/cms/cms.service";
import { seoService } from "@/features/seo/seo.service";
import { loadPublicLocaleContext } from "@/features/i18n/public-locale-context";
import { translationService } from "@/features/translation/translation.service";
import { getLocalizedField } from "@/lib/utils";

export const revalidate = 60;

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props) {
  const { locale } = await params;
  try {
    const page = await cmsService.getPublishedPageBySlug("why-choose-us");
    if (!page) return {};
    const [localeCtx, translations] = await Promise.all([
      loadPublicLocaleContext(locale),
      translationService.getForEntity("CmsPage", page.id),
    ]);

    return seoService.resolveMetadata({
      locale: locale as Locale,
      path: "/why-choose-us",
      entityType: "CMS_PAGE",
      entityId: page.id,
      seoMeta: page.seoMeta,
      fallback: {
        title:
          getLocalizedField(page, "title", locale, {
            enabledLocales: localeCtx.enabledLocales,
            defaultCode: localeCtx.defaultCode,
            translations,
          }) || "Why Choose Us",
        description: getLocalizedField(page, "excerpt", locale, {
          enabledLocales: localeCtx.enabledLocales,
          defaultCode: localeCtx.defaultCode,
          translations,
        }),
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
