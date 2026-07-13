import {
  normalizeLocalMediaUrl,
  normalizeRemoteImageUrl,
  shouldOptimizeNextImage,
} from "./next-image";

type LoaderParams = {
  src: string;
  width: number;
  quality?: number;
};

/**
 * Global next/image loader. Local `/uploads/` assets and catalog CDNs must bypass
 * `/_next/image` — Hostinger cannot reliably optimize runtime uploads (HTTP 400).
 */
export default function nextImageLoader({ src, width, quality }: LoaderParams): string {
  const normalized = normalizeLocalMediaUrl(normalizeRemoteImageUrl(src) ?? src);

  if (!shouldOptimizeNextImage(normalized)) {
    return normalized;
  }

  const params = new URLSearchParams();
  params.set("url", normalized);
  params.set("w", String(width));
  params.set("q", String(quality ?? 75));
  return `/_next/image?${params.toString()}`;
}
