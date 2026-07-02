import type { MediaType } from "@prisma/client";

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
  return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`;
}

export function mediaTypeFromMime(mime: string): MediaType {
  if (mime.startsWith("image/svg")) return "SVG";
  if (mime.startsWith("image/")) return "IMAGE";
  if (mime.startsWith("video/")) return "VIDEO";
  return "DOCUMENT";
}

export function acceptLabelForType(type?: MediaType | null): string {
  if (!type) return "Images, videos, documents, SVG";
  switch (type) {
    case "IMAGE":
      return "JPEG, PNG, WebP, GIF";
    case "VIDEO":
      return "MP4, WebM";
    case "DOCUMENT":
      return "PDF, text";
    case "SVG":
      return "SVG";
    default:
      return "";
  }
}
