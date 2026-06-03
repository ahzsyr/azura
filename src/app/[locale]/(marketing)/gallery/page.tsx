import { getTranslations, setRequestLocale } from "next-intl/server";
import { seoService } from "@/features/seo/seo.service";
import type { Locale } from "@/i18n/routing";
import { MarketingCmsPage } from "@/features/cms/components/marketing-cms-page";
import { loadSiteBrandContext } from "@/lib/load-site-brand-context";
import { GalleryStatic } from "./gallery-static";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props) {
  const { locale } = await params;
  const [t, { brandName }] = await Promise.all([
    getTranslations({ locale, namespace: "gallery" }),
    loadSiteBrandContext(),
  ]);
  return seoService.resolveMetadata({
    locale: locale as Locale,
    path: "/gallery",
    pageKey: "gallery",
    fallback: { title: t("title"), description: t("subtitle", { brandName }) },
  });
}

export default async function GalleryPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <MarketingCmsPage
      slug="gallery"
      locale={locale as Locale}
      fallback={<GalleryStatic locale={locale} />}
    />
  );
}
