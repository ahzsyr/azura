import { mediaTypeFromFilename, safeFilename } from "@/lib/local-media-storage";

export function filenameFromMediaUrl(url: string): string {
  try {
    const pathname = url.startsWith("/")
      ? url
      : new URL(url).pathname;
    const base = pathname.split("/").filter(Boolean).pop() ?? "linked-media";
    return safeFilename(decodeURIComponent(base)) || "linked-media";
  } catch {
    return "linked-media";
  }
}

export function isPersistableMediaUrl(url: string): boolean {
  if (url.startsWith("/")) return true;
  try {
    const parsed = new URL(url);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

export function mediaTypeForLinkedUrl(url: string) {
  return mediaTypeFromFilename(filenameFromMediaUrl(url)) ?? "IMAGE";
}
