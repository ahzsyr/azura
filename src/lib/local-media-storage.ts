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
  ".csv": "DOCUMENT",
  ".doc": "DOCUMENT",
  ".docx": "DOCUMENT",
  ".xls": "DOCUMENT",
  ".xlsx": "DOCUMENT",
  ".ppt": "DOCUMENT",
  ".pptx": "DOCUMENT",
  ".rtf": "DOCUMENT",
  ".zip": "DOCUMENT",
  ".svg": "SVG",
};

export function mediaTypeFromFilename(filename: string): MediaType | null {
  return EXT_TO_TYPE[extname(filename).toLowerCase()] ?? null;
}

const SVG_MIME_PREFIX = "image/svg";

function isSvgMime(mimeType: string): boolean {
  const mime = mimeType.toLowerCase().split(";")[0]?.trim() ?? "";
  return mime.startsWith(SVG_MIME_PREFIX);
}

/**
 * Prefer the file extension for SVG. Browsers/OS often send `text/plain`,
 * `text/xml`, or empty MIME for `.svg`, which used to persist as DOCUMENT
 * and hide the file behind a generic icon.
 */
export function resolveMediaType(filename: string, mimeType: string): MediaType {
  const byExt = mediaTypeFromFilename(filename);
  if (byExt === "SVG" || isSvgMime(mimeType)) return "SVG";
  if (mimeType && mimeType !== "application/octet-stream") {
    return mediaTypeFromMime(mimeType);
  }
  return byExt ?? "DOCUMENT";
}

const MIME_BY_EXT: Record<string, string> = {
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

/** Canonical Content-Type stored with the object (never trust a misleading browser MIME for SVG). */
export function mimeTypeForUpload(
  filename: string,
  fileType?: string | null,
  mediaType?: MediaType,
): string {
  const ext = extname(filename).toLowerCase();
  if (ext === ".svg" || mediaType === "SVG" || isSvgMime(fileType ?? "")) {
    return "image/svg+xml";
  }
  if (fileType && fileType !== "application/octet-stream") return fileType;
  return MIME_BY_EXT[ext] ?? "application/octet-stream";
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

/** Public form uploads: images + PDF only (no SVG/ZIP/HTML). */
const FORM_ALLOWED_EXT = new Set([
  ".jpg",
  ".jpeg",
  ".png",
  ".webp",
  ".gif",
  ".pdf",
]);

export function validateFormUploadFile(
  file: { name: string; type: string; size: number },
): { mediaType: MediaType } | { error: string } {
  const ext = extname(file.name).toLowerCase();
  if (ext === ".svg" || ext === ".zip" || file.type === "image/svg+xml" || file.type === "application/zip") {
    return { error: "SVG and ZIP uploads are not allowed on public forms" };
  }
  if (!FORM_ALLOWED_EXT.has(ext)) {
    return { error: "Only images (jpg, png, webp, gif) and PDF are allowed" };
  }
  const expected: MediaType = ext === ".pdf" ? "DOCUMENT" : "IMAGE";
  return validateUploadFile(file, expected);
}

export const FORM_UPLOAD_ACCEPT =
  "image/jpeg,image/png,image/webp,image/gif,.jpg,.jpeg,.png,.webp,.gif,application/pdf,.pdf";

export const ACCEPT_BY_TYPE: Record<MediaType, string> = {
  IMAGE: "image/jpeg,image/png,image/webp,image/gif,.jpg,.jpeg,.png,.webp,.gif",
  VIDEO: "video/mp4,video/webm,.mp4,.webm",
  DOCUMENT:
    "application/pdf,text/plain,text/csv,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation,application/rtf,application/zip,.pdf,.txt,.csv,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.rtf,.zip",
  SVG: "image/svg+xml,.svg",
};

export const ALL_MEDIA_ACCEPT = Object.values(ACCEPT_BY_TYPE).join(",");

export function acceptForMediaTypes(types?: MediaType[]): string {
  if (!types?.length) return ALL_MEDIA_ACCEPT;
  return [...new Set(types.flatMap((type) => ACCEPT_BY_TYPE[type].split(",")))].join(",");
}
