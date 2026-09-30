import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { GalleryEditPage } from "@/features/gallery/admin/gallery-edit-page";
import { localeService } from "@/features/i18n/locale.service";
import { loadTranslationsMap } from "@/features/translation/bilingual-serialize";
import { translationService } from "@/features/translation/translation.service";

type Props = { params: Promise<{ id: string }> };

export default async function AdminGalleryEditPage({ params }: Props) {
  const { id } = await params;

  let album = null;
  try {
    album = await prisma.gallery.findUnique({
      where: { id },
      include: {
        media: { orderBy: { sortOrder: "asc" } },
      },
    });
  } catch {
    // DB not connected
  }

  if (!album) notFound();

  const [locales, translations, mediaTranslations] = await Promise.all([
    localeService.listEnabled(),
    translationService.getForEntity("Gallery", album.id),
    loadTranslationsMap(
      "GalleryMedia",
      album.media.map((m) => m.id)
    ),
  ]);

  return (
    <GalleryEditPage
      album={album}
      locales={locales}
      translations={translations}
      mediaTranslations={mediaTranslations}
    />
  );
}
