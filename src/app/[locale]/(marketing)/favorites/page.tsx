import { setRequestLocale } from "next-intl/server";
import type { Locale } from "@/i18n/routing";
import { CmsPageBlocksSection } from "@/features/cms/components/cms-page-blocks-section";
import { FavoritesPageContent } from "@/features/account/components/favorites-page-content";
import { seoService } from "@/features/seo/seo.service";

export const revalidate = 60;

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props) {
  const { locale } = await params;
  return seoService.resolveMetadata({
    locale: locale as Locale,
    path: "/favorites",
    pageKey: "favorites",
    fallback: { title: "Favorites", description: "" },
  });
}

export default async function FavoritesPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <>
      <CmsPageBlocksSection slug="favorites" locale={locale as Locale} />
      <FavoritesPageContent locale={locale} />
    </>
  );
}
