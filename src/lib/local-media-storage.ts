import { extname } from "path";
import type { MediaType } from "@prisma/client";
import { mediaTypeFromMime } from "@/features/media/media.service";

export const UPLOAD_ROOT = "public/uploads";

export const MAX_BYTES: Record<MediaType, number> = {
  IMAGE: 8 * 1024 * 1024,
  VIDEO: 64 * 1024 * 1024,
  DOCUMENT: 16 * 1024 * 1024,
  SVG: 2 * 1024 * 1024,
};

export const SUBDIR: Record<MediaType, string> = {
  IMAGE: "images",
  VIDEO: "videos",
  DOCUMENT: "documents",
  SVG: "svg",
};

const EXT_TO_TYPE: Record<string, MediaType> = {
  ".jpg": "IMAGE",
  ".jpeg": "IMAGE",
  ".png": "IMAGE",
  ".webp": "IMAGE",
  ".gif": "IMAGE",
  ".mp4": "VIDEO",
  ".webm": "VIDEO",
  ".pdf": "DOCUMENT",
  ".txt": "DOCUMENT",
  ".svg": "SVG",
};

export function mediaTypeFromFilename(filename: string): MediaType | null {
  return EXT_TO_TYPE[extname(filename).toLowerCase()] ?? null;
}

export function resolveMediaType(filename: string, mimeType: string): MediaType {
  if (mimeType && mimeType !== "application/octet-stream") {
    return mediaTypeFromMime(mimeType);
  }
  return mediaTypeFromFilename(filename) ?? "DOCUMENT";
}

export function safeFilename(name: string): string {
  const base = name.replace(/[^a-zA-Z0-9._-]/g, "_").replace(/_+/g, "_");
  return base.slice(0, 120) || "file";
}

export function validateUploadFile(
  file: { name: string; type: string; size: number },
  expectedType?: MediaType
): { mediaType: MediaType } | { error: string } {
  let mediaType = resolveMediaType(file.name, file.type);
  const maxBytes = MAX_BYTES[mediaType];

  if (expectedType && mediaType !== expectedType) {
    const byExt = mediaTypeFromFilename(file.name);
    if (byExt && byExt === expectedType) {
      mediaType = byExt;
    } else {
      return { error: `Expected ${expectedType.toLowerCase()} file, got ${mediaType.toLowerCase()}` };
    }
  }

  if (!mediaTypeFromFilename(file.name) && (!file.type || file.type === "application/octet-stream")) {
    return { error: "Unsupported file type" };
  }

  if (file.size <= 0) {
    return { error: "Empty file" };
  }

  if (file.size > maxBytes) {
    const mb = Math.round(maxBytes / 1024 / 1024);
    return { error: `File too large (max ${mb} MB)` };
  }

  return { mediaType };
}

export const ACCEPT_BY_TYPE: Record<MediaType, string> = {
  IMAGE: "image/jpeg,image/png,image/webp,image/gif,.jpg,.jpeg,.png,.webp,.gif",
  VIDEO: "video/mp4,video/webm,.mp4,.webm",
  DOCUMENT: "application/pdf,text/plain,.pdf,.txt",
  SVG: "image/svg+xml,.svg",
};

export const ALL_MEDIA_ACCEPT = Object.values(ACCEPT_BY_TYPE).join(",");

export function acceptForMediaTypes(types?: MediaType[]): string {
  if (!types?.length) return ALL_MEDIA_ACCEPT;
  return [...new Set(types.flatMap((type) => ACCEPT_BY_TYPE[type].split(",")))].join(",");
}
