import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { ArrowLeft } from "lucide-react";
import Image from "next/image";
import { PageHero, Section } from "@/components/marketing/section";
import { GalleryAlbumView } from "@/components/marketing/gallery-album-view";
import { getGalleryBySlug } from "@/lib/data";
import { seoService } from "@/features/seo/seo.service";
import { getLocalizedField } from "@/lib/utils";
import { sharedElementAttrs } from "@/lib/navigation/shared-elements";
import type { Locale } from "@/i18n/routing";
import type { CSSProperties, HTMLAttributes } from "react";

type Props = { params: Promise<{ locale: string; slug: string }> };

export async function generateMetadata({ params }: Props) {
  const { locale, slug } = await params;
  const album = await getGalleryBySlug(slug);
  if (!album) return { title: "Gallery" };

  return seoService.resolveMetadata({
    locale: locale as Locale,
    path: `/gallery/${slug}`,
    pageKey: "gallery",
    fallback: {
      title: getLocalizedField(album, "title", locale),
      description: getLocalizedField(album, "excerpt", locale) || getLocalizedField(album, "description", locale),
    },
  });
}

export default async function GalleryAlbumPage({ params }: Props) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "gallery" });
  const album = await getGalleryBySlug(slug);

  if (!album) notFound();

  const albumTitle = getLocalizedField(album, "title", locale);
  const imageShared = sharedElementAttrs("gallery", slug, "image");
  const titleShared = sharedElementAttrs("gallery", slug, "title");

  return (
    <>
      {album.coverUrl ? (
        <div
          className="relative aspect-[21/9] w-full overflow-hidden"
          data-shared-element={imageShared["data-shared-element"]}
          data-shared-element-type={imageShared["data-shared-element-type"]}
          data-shared-element-id={imageShared["data-shared-element-id"]}
          style={imageShared.style}
        >
          <Image src={album.coverUrl} alt={albumTitle} fill className="object-cover" priority sizes="100vw" />
        </div>
      ) : null}
      <PageHero
        title={albumTitle}
        subtitle={getLocalizedField(album, "excerpt", locale) || t("subtitle")}
        titleProps={{
          "data-shared-element": titleShared["data-shared-element"],
          "data-shared-element-type": titleShared["data-shared-element-type"],
          "data-shared-element-id": titleShared["data-shared-element-id"],
          style: titleShared.style,
        } as HTMLAttributes<HTMLHeadingElement>}
      />
      <Section>
        <Link
          href="/gallery"
          className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          {t("backToGallery")}
        </Link>
        <GalleryAlbumView album={album} locale={locale} />
      </Section>
    </>
  );
}
