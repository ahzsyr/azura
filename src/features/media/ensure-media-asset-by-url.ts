import { extname } from "path";
import type { MediaAsset } from "@prisma/client";
import { mediaRepository } from "@/repositories/media.repository";
import { searchIndexer } from "@/capabilities/search/search-indexer.service";
import {
  filenameFromMediaUrl,
  isPersistableMediaUrl,
  mediaTypeForLinkedUrl,
} from "@/features/media/ensure-media-asset-by-url.utils";

const EXT_TO_MIME: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".pdf": "application/pdf",
};

/**
 * Resolve a media URL to a MediaAsset for relations that only store featuredImageId.
 * Creates a lightweight asset row for external/link URLs that are not yet in the library.
 */
export async function ensureMediaAssetByUrl(url: string): Promise<MediaAsset | null> {
  const trimmed = url.trim();
  if (!trimmed || !isPersistableMediaUrl(trimmed)) return null;

  const existing = await mediaRepository.findByUrl(trimmed);
  if (existing) return existing;

  const filename = filenameFromMediaUrl(trimmed);
  const ext = extname(filename).toLowerCase();
  const mediaType = mediaTypeForLinkedUrl(trimmed);
  const mimeType = EXT_TO_MIME[ext] ?? (mediaType === "IMAGE" ? "image/jpeg" : "application/octet-stream");

  const asset = await mediaRepository.createAsset({
    filename,
    url: trimmed,
    mimeType,
    mediaType,
    sizeBytes: 0,
    assetScope: "CMS",
  });

  try {
    await searchIndexer.indexMedia(asset);
  } catch (error) {
    console.error("[media] search index failed for linked asset:", error);
  }

  return asset;
}
