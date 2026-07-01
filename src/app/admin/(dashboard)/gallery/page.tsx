import { prisma } from "@/lib/prisma";
import { GalleryManager } from "@/features/gallery/admin/gallery-manager";
import type { GalleryAlbumAdmin } from "@/features/gallery/types";
import { loadAdminRowsWithLocalizedFields } from "@/features/translation/admin-entity-helpers";
import { readAdminLocaleField } from "@/features/translation/admin-localized-view";

export default async function AdminGalleryPage() {
  let albums: GalleryAlbumAdmin[] = [];
  try {
    const rows = await prisma.gallery.findMany({
      orderBy: { sortOrder: "asc" },
      include: {
        media: {
          orderBy: { sortOrder: "asc" },
          take: 1,
          select: { mediaUrl: true, mediaKind: true },
        },
        _count: { select: { media: true } },
      },
    });

    const withTranslations = await loadAdminRowsWithLocalizedFields("Gallery", rows, [
      "title",
      "subtitle",
      "description",
      "info",
    ]);

    albums = withTranslations.map((row) => ({
      id: row.id,
      slug: row.slug,
      displayTitle: row.displayTitle,
      titleEn: row.displayTitle,
      titleAr: readAdminLocaleField(row, "title", "ar"),
      excerptEn: readAdminLocaleField(row, "subtitle", "en") || null,
      excerptAr: readAdminLocaleField(row, "subtitle", "ar") || null,
      descriptionEn: readAdminLocaleField(row, "description", "en"),
      descriptionAr: readAdminLocaleField(row, "description", "ar"),
      infoEn: readAdminLocaleField(row, "info", "en") || null,
      infoAr: readAdminLocaleField(row, "info", "ar") || null,
      coverUrl: row.coverUrl,
      sortOrder: row.sortOrder,
      isPublished: row.isPublished,
      mediaCount: row._count.media,
      previewUrl: row.coverUrl ?? row.media[0]?.mediaUrl ?? null,
    }));
  } catch {
    // DB not connected
  }

  return <GalleryManager albums={albums} />;
}
