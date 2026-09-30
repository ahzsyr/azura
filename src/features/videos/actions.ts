"use server";

import { revalidatePath } from "next/cache";
import type { VideoStatus } from "@prisma/client";
import { requireAdmin } from "@/features/auth/guards";
import { revalidateMarketingHome } from "@/services/cache";
import { isJpgOrPngThumbnail } from "./video-validation";
import { videoService } from "./video.service";
import { prisma } from "@/lib/prisma";

function revalidateVideoPaths(slug?: string, id?: string) {
  revalidateMarketingHome();
  revalidatePath("/admin/videos");
  revalidatePath("/admin/videos/new");
  revalidatePath("/videos");
  if (id) revalidatePath(`/admin/videos/${id}`);
  if (slug) revalidatePath(`/videos/${slug}`);
}

function optionalText(raw: FormDataEntryValue | null): string | null {
  const value = (raw as string | null)?.trim();
  return value || null;
}

function parseUploadDate(raw: FormDataEntryValue | null): Date {
  const value = (raw as string | null)?.trim();
  if (value) {
    const date = new Date(value);
    if (!Number.isNaN(date.getTime())) return date;
  }
  return new Date();
}

function parseStatus(raw: FormDataEntryValue | null): VideoStatus {
  return raw === "PUBLISHED" ? "PUBLISHED" : "DRAFT";
}

export async function upsertVideo(formData: FormData) {
  await requireAdmin();
  const id = (formData.get("id") as string | null) || undefined;
  const title = (formData.get("title") as string | null)?.trim() ?? "";
  const description = (formData.get("description") as string | null)?.trim() ?? "";
  const slug = optionalText(formData.get("slug")) ?? undefined;
  const locale = optionalText(formData.get("locale")) ?? "en";
  const contentMediaId = (formData.get("contentMediaId") as string | null)?.trim() ?? "";
  const thumbnailMediaId = (formData.get("thumbnailMediaId") as string | null)?.trim() ?? "";
  const duration = optionalText(formData.get("duration"));
  const embedUrl = optionalText(formData.get("embedUrl"));
  const status = parseStatus(formData.get("status"));
  const uploadDate = parseUploadDate(formData.get("uploadDate"));

  if (!title) throw new Error("Title is required");
  if (!description) throw new Error("Description is required");
  if (!contentMediaId) throw new Error("Content video is required");
  if (!thumbnailMediaId) throw new Error("Thumbnail is required");

  const thumb = await prisma.mediaAsset.findUnique({
    where: { id: thumbnailMediaId },
    select: { mimeType: true, url: true, mediaType: true },
  });
  if (!thumb || thumb.mediaType === "SVG" || !isJpgOrPngThumbnail(thumb.mimeType, thumb.url)) {
    throw new Error("Thumbnail must be JPG or PNG (SVG is not allowed)");
  }

  const video = id
    ? await videoService.update(id, {
        title,
        description,
        slug,
        locale,
        contentMediaId,
        thumbnailMediaId,
        duration,
        embedUrl,
        status,
        uploadDate,
      })
    : await videoService.create({
        title,
        description,
        slug,
        locale,
        contentMediaId,
        thumbnailMediaId,
        duration,
        embedUrl,
        status,
        uploadDate,
      });

  revalidateVideoPaths(video.slug, video.id);
  return video;
}

export async function deleteVideo(id: string) {
  await requireAdmin();
  const existing = await prisma.video.findUnique({ where: { id }, select: { slug: true } });
  await videoService.delete(id);
  revalidateVideoPaths(existing?.slug, id);
}

export async function toggleVideoPublished(id: string, publish: boolean) {
  await requireAdmin();
  const video = await videoService.update(id, { status: publish ? "PUBLISHED" : "DRAFT" });
  revalidateVideoPaths(video.slug, video.id);
  return video;
}
