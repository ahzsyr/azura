import { basename } from "path";

const UPLOAD_FALLBACK_SUBDIRS = ["svg", "images", "documents", "videos", "audio", "other"] as const;

/** Same filename under other upload folders — SVG was often stored as DOCUMENT. */
export function uploadFallbackUrls(url: string): string[] {
  if (!url.startsWith("/uploads/")) return [];
  const filename = basename(url);
  if (!filename || filename.includes("..")) return [url];
  const urls = [url];
  for (const dir of UPLOAD_FALLBACK_SUBDIRS) {
    const alt = `/uploads/${dir}/${filename}`;
    if (!urls.includes(alt)) urls.push(alt);
  }
  return urls;
}
