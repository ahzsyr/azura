import { prisma } from "@/lib/prisma";
import { GalleryManager } from "@/features/gallery/admin/gallery-manager";
import type { GalleryAlbumAdmin } from "@/features/gallery/types";

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

    albums = rows.map((row) => ({
      id: row.id,
      slug: row.slug,
      titleEn: row.titleEn,
      titleAr: row.titleAr,
      excerptEn: row.excerptEn,
      excerptAr: row.excerptAr,
      descriptionEn: row.descriptionEn,
      descriptionAr: row.descriptionAr,
      infoEn: row.infoEn,
      infoAr: row.infoAr,
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
