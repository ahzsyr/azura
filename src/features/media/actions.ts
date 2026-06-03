"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/features/auth/guards";
import { mediaRepository } from "@/repositories/media.repository";
import { searchIndexer } from "@/features/search/search-indexer.service";
import { mediaTypeFromMime } from "./media.service";
import type { MediaType } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { deleteLocalUploadFile } from "@/lib/local-media-files";
import { persistMediaUpload } from "@/features/media/persist-upload";
const mediaQuerySchema = z.object({
  search: z.string().optional(),
  folderId: z.string().nullable().optional(),
  mediaType: z.enum(["IMAGE", "VIDEO", "DOCUMENT", "SVG"]).optional(),
});

export async function createMediaFromUpload(data: {
  filename: string;
  url: string;
  mimeType: string;
  mediaType: MediaType;
  sizeBytes: number;
  folderId?: string | null;
  width?: number;
  height?: number;
  uploadedById?: string;
}) {
  const session = await requireAdmin();
  const asset = await persistMediaUpload({
    ...data,
    uploadedById: data.uploadedById ?? session.user.id,
    uploaderEmail: session.user.email,
  });
  return { success: true, id: asset.id, url: asset.url };
}

export async function fetchMediaAssets(raw: {
  search?: string;
  folderId?: string | null;
  mediaType?: MediaType;
}) {
  await requireAdmin();
  const params = mediaQuerySchema.parse(raw);
  return mediaRepository.listAssets({
    search: params.search,
    folderId: params.folderId,
    mediaType: params.mediaType,
  });
}

export async function getMediaAssetDetail(id: string) {
  await requireAdmin();
  return mediaRepository.getAsset(id);
}

export async function updateMediaAsset(
  id: string,
  data: {
    filename?: string;
    altEn?: string;
    altAr?: string;
    folderId?: string | null;
  }
) {
  await requireAdmin();
  await mediaRepository.updateAsset(id, {
    filename: data.filename,
    altEn: data.altEn,
    altAr: data.altAr,
    folder:
      data.folderId === undefined
        ? undefined
        : data.folderId
          ? { connect: { id: data.folderId } }
          : { disconnect: true },
  });
  revalidatePath("/admin/media");
  return { success: true };
}

export async function replaceMediaAsset(
  id: string,
  data: { url: string; sizeBytes: number; mimeType?: string; filename?: string }
) {
  await requireAdmin();
  const existing = await mediaRepository.getAsset(id);
  const mime = data.mimeType ?? "application/octet-stream";
  await mediaRepository.updateAsset(id, {
    url: data.url,
    sizeBytes: data.sizeBytes,
    mimeType: data.mimeType ?? undefined,
    mediaType: mediaTypeFromMime(mime),
    filename: data.filename,
  });
  if (existing?.url && existing.url !== data.url) {
    await deleteLocalUploadFile(existing.url);
  }
  revalidatePath("/admin/media");
  return { success: true };
}

export async function deleteMediaAssets(ids: string[]) {
  await requireAdmin();
  const assets = await prisma.mediaAsset.findMany({
    where: { id: { in: ids } },
    select: { id: true, url: true },
  });
  for (const id of ids) await searchIndexer.remove("MEDIA", id);
  await mediaRepository.deleteAssets(ids);
  for (const asset of assets) {
    await deleteLocalUploadFile(asset.url);
  }
  revalidatePath("/admin/media");
  return { success: true };
}

export async function createMediaFolder(name: string, parentId?: string | null) {
  await requireAdmin();
  const folder = await mediaRepository.createFolder(name, parentId);
  revalidatePath("/admin/media");
  return { success: true, id: folder.id };
}

export async function renameMediaFolder(id: string, name: string) {
  await requireAdmin();
  await mediaRepository.renameFolder(id, name);
  revalidatePath("/admin/media");
  return { success: true };
}

export async function deleteMediaFolder(id: string) {
  await requireAdmin();
  await mediaRepository.deleteFolder(id);
  revalidatePath("/admin/media");
  return { success: true };
}

export async function bulkMoveMedia(ids: string[], folderId: string | null) {
  await requireAdmin();
  for (const id of ids) {
    await mediaRepository.updateAsset(id, {
      folder: folderId ? { connect: { id: folderId } } : { disconnect: true },
    });
  }
  revalidatePath("/admin/media");
  return { success: true };
}

export async function trackMediaUsage(
  mediaId: string,
  entityType: string,
  entityId: string,
  field = "default"
) {
  await requireAdmin();
  await mediaRepository.trackUsage(mediaId, entityType, entityId, field);
  return { success: true };
}

export async function trackMediaUsageByUrl(
  url: string,
  entityType: string,
  entityId: string,
  field = "default"
) {
  await requireAdmin();
  const asset = await mediaRepository.findByUrl(url);
  if (!asset) return { success: false };
  await mediaRepository.trackUsage(asset.id, entityType, entityId, field);
  return { success: true, mediaId: asset.id };
}

export async function getMediaStorageStats() {
  await requireAdmin();
  const [totalBytes, byType] = await Promise.all([
    mediaRepository.totalStorageBytes(),
    mediaRepository.storageStatsByType(),
  ]);
  return { totalBytes, byType };
}

export async function scanMediaUsagesAction() {
  await requireAdmin();
  const { mediaUsageScanner } = await import("./media-usage-scanner.service");
  const result = await mediaUsageScanner.scanAll();
  revalidatePath("/admin/media");
  return { success: true, ...result };
}
