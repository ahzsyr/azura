import { getTranslations } from "next-intl/server";
import { PageHero, Section } from "@/components/marketing/section";
import { GalleryAlbumGrid } from "@/components/marketing/gallery-album-grid";
import { getGalleries } from "@/lib/data";
import { loadSiteBrandContext } from "@/lib/load-site-brand-context";

type Props = { locale: string };

export async function GalleryStatic({ locale }: Props) {
  const [t, { brandName }, albums] = await Promise.all([
    getTranslations({ locale, namespace: "gallery" }),
    loadSiteBrandContext(),
    getGalleries(),
  ]);

  return (
    <>
      <PageHero title={t("title")} subtitle={t("subtitle", { brandName })} />
      <Section>
        <GalleryAlbumGrid albums={albums} locale={locale} />
      </Section>
    </>
  );
}
