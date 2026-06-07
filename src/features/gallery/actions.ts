"use server";

import { revalidatePath } from "next/cache";
import type { GalleryMediaKind } from "@prisma/client";
import { requireAdmin } from "@/features/auth/guards";
import { mediaRepository } from "@/repositories/media.repository";
import { revalidateMarketingHome } from "@/services/cache";
import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/utils";
import { localeService } from "@/features/i18n/locale.service";
import { syncEntityTranslationsFromForm, extractLegacyColumns } from "@/features/translation/form-sync";

function checkboxValue(raw: FormDataEntryValue | null): boolean {
  return raw === "true" || raw === "on" || raw === "1";
}

function optionalText(raw: FormDataEntryValue | null): string | null {
  const value = (raw as string | null)?.trim();
  return value || null;
}

function revalidateGalleryPaths(slug?: string, galleryId?: string) {
  revalidateMarketingHome();
  revalidatePath("/admin/gallery");
  revalidatePath("/admin/gallery/new");
  revalidatePath("/gallery");
  if (galleryId) revalidatePath(`/admin/gallery/${galleryId}`);
  if (slug) revalidatePath(`/gallery/${slug}`);
}

function inferMediaKindFromUrl(mediaUrl: string, kind?: GalleryMediaKind): GalleryMediaKind {
  if (kind === "VIDEO" || kind === "IMAGE") return kind;
  if (/\.(mp4|webm|mov|ogg)(\?|$)/i.test(mediaUrl)) return "VIDEO";
  return "IMAGE";
}

function defaultTitleFromUrl(url: string): string {
  try {
    const pathname = new URL(url, "http://local").pathname;
    const base = pathname.split("/").pop()?.replace(/\.[^.]+$/, "") ?? "";
    return base.replace(/[-_]+/g, " ").trim() || "Untitled";
  } catch {
    return "Untitled";
  }
}

async function uniqueSlug(base: string, excludeId?: string): Promise<string> {
  let slug = slugify(base) || "gallery";
  let candidate = slug;
  let n = 1;
  while (true) {
    const existing = await prisma.gallery.findFirst({
      where: { slug: candidate, ...(excludeId ? { NOT: { id: excludeId } } : {}) },
      select: { id: true },
    });
    if (!existing) return candidate;
    n += 1;
    candidate = `${slug}-${n}`;
  }
}

function inferMediaKind(raw: FormDataEntryValue | null, mediaUrl: string): GalleryMediaKind {
  const kind = raw as string | null;
  if (kind === "VIDEO" || kind === "IMAGE") return kind;
  if (/\.(mp4|webm|mov|ogg)(\?|$)/i.test(mediaUrl)) return "VIDEO";
  return "IMAGE";
}

export async function upsertGallery(formData: FormData) {
  await requireAdmin();
  const enabledLocales = await localeService.listEnabled();
  const id = (formData.get("id") as string | null) || undefined;
  const titleLegacy = extractLegacyColumns(formData, enabledLocales, "title");
  const titleEn = titleLegacy.titleEn ?? (formData.get("titleEn") as string) ?? "";
  const slugInput = (formData.get("slug") as string | null)?.trim();
  const slug = slugInput
    ? await uniqueSlug(slugInput, id)
    : await uniqueSlug(titleEn, id);

  const excerptLegacy = extractLegacyColumns(formData, enabledLocales, "excerpt");
  const descriptionLegacy = extractLegacyColumns(formData, enabledLocales, "description");
  const infoLegacy = extractLegacyColumns(formData, enabledLocales, "info");

  const data = {
    slug,
    titleEn,
    titleAr: titleLegacy.titleAr ?? (formData.get("titleAr") as string) ?? "",
    excerptEn: optionalText(formData.get("excerptEn")) ?? excerptLegacy.excerptEn ?? null,
    excerptAr: optionalText(formData.get("excerptAr")) ?? excerptLegacy.excerptAr ?? null,
    descriptionEn:
      (formData.get("descriptionEn") as string) || descriptionLegacy.descriptionEn || "",
    descriptionAr:
      (formData.get("descriptionAr") as string) || descriptionLegacy.descriptionAr || "",
    infoEn: optionalText(formData.get("infoEn")) ?? infoLegacy.infoEn ?? null,
    infoAr: optionalText(formData.get("infoAr")) ?? infoLegacy.infoAr ?? null,
    coverUrl: optionalText(formData.get("coverUrl")),
    isPublished: checkboxValue(formData.get("isPublished")),
    sortOrder: Number(formData.get("sortOrder") ?? 0),
  };

  const gallery = id
    ? await prisma.gallery.update({ where: { id }, data })
    : await prisma.gallery.create({
        data: {
          ...data,
          sortOrder: data.sortOrder || (await prisma.gallery.count()),
        },
      });

  const coverMediaId = (formData.get("coverMediaAssetId") as string | null) || null;
  const trackedId = coverMediaId ?? (data.coverUrl ? (await mediaRepository.findByUrl(data.coverUrl))?.id : null);
  if (trackedId && data.coverUrl) {
    await mediaRepository.trackUsage(trackedId, "GALLERY", gallery.id, "coverUrl");
  }

  await syncEntityTranslationsFromForm(formData, "Gallery", gallery.id, enabledLocales);

  revalidateGalleryPaths(gallery.slug, gallery.id);
  return gallery;
}

export async function deleteGallery(id: string) {
  await requireAdmin();
  const gallery = await prisma.gallery.findUnique({ where: { id }, select: { slug: true } });
  await prisma.gallery.delete({ where: { id } });
  revalidateGalleryPaths(gallery?.slug, id);
}

export async function addGalleryMediaQuick(
  galleryId: string,
  mediaUrl: string,
  opts?: {
    titleEn?: string;
    titleAr?: string;
    mediaAssetId?: string | null;
    mediaKind?: GalleryMediaKind;
  }
) {
  await requireAdmin();
  const url = mediaUrl.trim();
  if (!url) return;

  const titleEn = opts?.titleEn?.trim() || defaultTitleFromUrl(url);
  const titleAr = opts?.titleAr?.trim() || titleEn;
  const mediaKind = inferMediaKindFromUrl(url, opts?.mediaKind);
  const sortOrder = await prisma.galleryMedia.count({ where: { galleryId } });

  const item = await prisma.galleryMedia.create({
    data: {
      galleryId,
      titleEn,
      titleAr,
      mediaUrl: url,
      mediaKind,
      sortOrder,
      isPublished: true,
    },
  });

  const trackedId = opts?.mediaAssetId ?? (await mediaRepository.findByUrl(url))?.id;
  if (trackedId) {
    await mediaRepository.trackUsage(trackedId, "GALLERY", item.id, "mediaUrl");
  }

  const gallery = await prisma.gallery.findUnique({
    where: { id: galleryId },
    select: { slug: true },
  });
  revalidateGalleryPaths(gallery?.slug, galleryId);
  return item;
}

export async function reorderGalleries(ids: string[]) {
  await requireAdmin();
  await prisma.$transaction(
    ids.map((id, index) =>
      prisma.gallery.update({ where: { id }, data: { sortOrder: index } })
    )
  );
  revalidateGalleryPaths();
}

export async function toggleGalleryPublished(id: string, isPublished: boolean) {
  await requireAdmin();
  const gallery = await prisma.gallery.update({
    where: { id },
    data: { isPublished },
    select: { slug: true, id: true },
  });
  revalidateGalleryPaths(gallery.slug, id);
}

export async function upsertGalleryMedia(formData: FormData) {
  await requireAdmin();
  const id = (formData.get("id") as string | null) || undefined;
  const galleryId = formData.get("galleryId") as string;
  const mediaUrl = formData.get("mediaUrl") as string;
  const mediaAssetId = (formData.get("mediaAssetId") as string | null) || null;

  const data = {
    galleryId,
    titleEn: formData.get("titleEn") as string,
    titleAr: formData.get("titleAr") as string,
    excerptEn: optionalText(formData.get("excerptEn")),
    excerptAr: optionalText(formData.get("excerptAr")),
    descriptionEn: (formData.get("descriptionEn") as string) || "",
    descriptionAr: (formData.get("descriptionAr") as string) || "",
    infoEn: optionalText(formData.get("infoEn")),
    infoAr: optionalText(formData.get("infoAr")),
    mediaUrl,
    mediaKind: inferMediaKind(formData.get("mediaKind"), mediaUrl),
    isPublished: checkboxValue(formData.get("isPublished")),
    sortOrder: Number(formData.get("sortOrder") ?? 0),
  };

  const item = id
    ? await prisma.galleryMedia.update({ where: { id }, data })
    : await prisma.galleryMedia.create({
        data: {
          ...data,
          sortOrder:
            data.sortOrder ||
            (await prisma.galleryMedia.count({ where: { galleryId } })),
        },
      });

  const trackedId = mediaAssetId ?? (await mediaRepository.findByUrl(mediaUrl))?.id;
  if (trackedId) {
    await mediaRepository.trackUsage(trackedId, "GALLERY", item.id, "mediaUrl");
  }

  const gallery = await prisma.gallery.findUnique({
    where: { id: galleryId },
    select: { slug: true },
  });
  revalidateGalleryPaths(gallery?.slug, galleryId);
  return item;
}

export async function deleteGalleryMedia(id: string) {
  await requireAdmin();
  const item = await prisma.galleryMedia.findUnique({
    where: { id },
    select: { galleryId: true, gallery: { select: { slug: true } } },
  });
  await prisma.galleryMedia.delete({ where: { id } });
  revalidateGalleryPaths(item?.gallery.slug, item?.galleryId);
}

export async function reorderGalleryMedia(galleryId: string, ids: string[]) {
  await requireAdmin();
  await prisma.$transaction(
    ids.map((id, index) =>
      prisma.galleryMedia.update({
        where: { id, galleryId },
        data: { sortOrder: index },
      })
    )
  );
  const gallery = await prisma.gallery.findUnique({
    where: { id: galleryId },
    select: { slug: true },
  });
  revalidateGalleryPaths(gallery?.slug, galleryId);
}

export async function toggleGalleryMediaPublished(id: string, isPublished: boolean) {
  await requireAdmin();
  const item = await prisma.galleryMedia.update({
    where: { id },
    data: { isPublished },
    select: { galleryId: true, gallery: { select: { slug: true } } },
  });
  revalidateGalleryPaths(item.gallery.slug, item.galleryId);
}

export async function fetchGalleryWithMedia(galleryId: string) {
  await requireAdmin();
  return prisma.gallery.findUnique({
    where: { id: galleryId },
    include: {
      media: { orderBy: { sortOrder: "asc" } },
    },
  });
}

export async function fetchGalleriesForBuilder() {
  await requireAdmin();
  const rows = await prisma.gallery.findMany({
    orderBy: { sortOrder: "asc" },
    select: {
      slug: true,
      titleEn: true,
      titleAr: true,
      isPublished: true,
      _count: { select: { media: true } },
    },
  });
  return rows.map((row) => ({
    slug: row.slug,
    titleEn: row.titleEn,
    titleAr: row.titleAr,
    isPublished: row.isPublished,
    mediaCount: row._count.media,
  }));
}
