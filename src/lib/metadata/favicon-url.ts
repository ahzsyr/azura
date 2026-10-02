import { isSvgMediaUrl, normalizeLocalMediaUrl } from "@/lib/config/next-image";

function hasUrlProtocol(value: string): boolean {
  return /^[a-z][a-z0-9+\-.]*:/i.test(value);
}

/**
 * Ensures favicon URLs resolve correctly from nested routes like `/ar/...`.
 * Theme values may be stored as `uploads/...` without a leading slash.
 */
export function resolveFaviconUrl(url: string | null | undefined): string | undefined {
  const trimmed = url?.trim();
  if (!trimmed) return undefined;
  if (trimmed.startsWith("data:") || trimmed.startsWith("blob:")) return trimmed;
  const normalized = normalizeLocalMediaUrl(trimmed);
  if (normalized.startsWith("/") || normalized.startsWith("//") || hasUrlProtocol(normalized)) {
    return normalized;
  }
  return `/${normalized.replace(/^\/+/, "")}`;
}

export type ManifestIconEntry = { src: string; sizes: string; type: string };

/**
 * Chrome rejects an SVG advertised as `image/png` with
 * "Download error or resource isn't a valid image".
 */
export function manifestIconsForUrl(iconUrl: string): ManifestIconEntry[] {
  if (isSvgMediaUrl(iconUrl)) {
    return [{ src: iconUrl, sizes: "any", type: "image/svg+xml" }];
  }
  const path = iconUrl.split("?")[0]?.split("#")[0]?.toLowerCase() ?? "";
  if (path.endsWith(".ico")) {
    return [{ src: iconUrl, sizes: "any", type: "image/x-icon" }];
  }
  return [
    { src: iconUrl, sizes: "192x192", type: "image/png" },
    { src: iconUrl, sizes: "512x512", type: "image/png" },
  ];
}
