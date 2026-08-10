import { revalidatePath } from "next/cache";
import type { MediaType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { mediaRepository } from "@/repositories/media.repository";
import { searchIndexer } from "@/capabilities/search/search-indexer.service";

export async function resolveUploaderId(preferredId?: string, email?: string | null) {
  const ids = preferredId ? [preferredId] : [];
  for (const id of ids) {
    const user = await prisma.user.findUnique({ where: { id }, select: { id: true } });
    if (user) return user.id;
  }
  if (email) {
    const user = await prisma.user.findUnique({ where: { email }, select: { id: true } });
    if (user) return user.id;
  }
  return undefined;
}

export async function persistMediaUpload(data: {
  filename: string;
  url: string;
  mimeType: string;
  mediaType: MediaType;
  sizeBytes: number;
  folderId?: string | null;
  width?: number;
  height?: number;
  uploadedById?: string;
  uploaderEmail?: string | null;
  assetScope?: string;
}) {
  const uploaderId = await resolveUploaderId(data.uploadedById, data.uploaderEmail);
  const asset = await mediaRepository.createAsset({
    filename: data.filename,
    url: data.url,
    mimeType: data.mimeType,
    mediaType: data.mediaType,
    sizeBytes: data.sizeBytes,
    width: data.width,
    height: data.height,
    assetScope: data.assetScope ?? "CMS",
    folder: data.folderId ? { connect: { id: data.folderId } } : undefined,
    uploadedBy: uploaderId ? { connect: { id: uploaderId } } : undefined,
  });

  try {
    await searchIndexer.indexMedia(asset);
  } catch (error) {
    console.error("[media] search index failed:", error);
  }

  revalidatePath("/admin/media");
  return asset;
}
