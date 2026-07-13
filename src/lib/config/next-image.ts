import type { ImageConfig } from "next/dist/shared/lib/image-config";

/** Local paths allowed for next/image (keep in sync with next.config.ts). */
export const NEXT_IMAGE_LOCAL_PATTERNS: NonNullable<ImageConfig["localPatterns"]> = [
  { pathname: "/uploads/**" },
  { pathname: "/assets/**" },
  { pathname: "/images/**" },
];

/** Remote hosts allowed for next/image (keep in sync with next.config.ts). */
export const NEXT_IMAGE_REMOTE_PATTERNS: NonNullable<ImageConfig["remotePatterns"]> = [
  { protocol: "https", hostname: "images.unsplash.com" },
  { protocol: "https", hostname: "utfs.io" },
  { protocol: "https", hostname: "*.uploadthing.com" },
  { protocol: "https", hostname: "uploadthing.com" },
  { protocol: "https", hostname: "developers.elementor.com" },
  { protocol: "https", hostname: "*.supabase.co" },
  /** Product catalog media (JSON imports / listing index). */
  { protocol: "https", hostname: "www.getic.com" },
  { protocol: "https", hostname: "getic.com" },
];

const LOCAL_PREFIXES = ["/uploads/", "/assets/", "/images/"] as const;
const ABSOLUTE_COLLAPSIBLE_LOCAL_PREFIXES = ["/uploads/", "/assets/"] as const;

const REMOTE_HOSTS = new Set(["www.getic.com", "getic.com"]);

/**
 * Collapse same-origin media paths to root-relative URLs for next/image and static serving.
 * Absolute URLs like `https://your-domain.com/uploads/...` are not in remotePatterns and
 * break the optimizer with HTTP 400 on Hostinger when Sharp cannot process runtime uploads.
 */
export function normalizeLocalMediaUrl(url: string): string {
  const trimmed = url.trim();
  if (!trimmed) return trimmed;
  if (LOCAL_PREFIXES.some((prefix) => trimmed.startsWith(prefix))) {
    return trimmed;
  }
  const unprefixed = trimmed.replace(/^\/+/, "");
  if (LOCAL_PREFIXES.some((prefix) => unprefixed.startsWith(prefix.slice(1)))) {
    return `/${unprefixed}`;
  }
  try {
    const parsed = new URL(trimmed);
    if (
      ABSOLUTE_COLLAPSIBLE_LOCAL_PREFIXES.some((prefix) =>
        parsed.pathname.startsWith(prefix),
      )
    ) {
      return parsed.pathname + parsed.search;
    }
  } catch {
    // keep relative/invalid values as-is
  }
  return trimmed;
}

export function isLocalUploadUrl(url: string): boolean {
  return normalizeLocalMediaUrl(url).startsWith("/uploads/");
}

export function isSvgMediaUrl(url: string): boolean {
  const normalized = normalizeLocalMediaUrl(url);
  const path = normalized.split("?")[0]?.split("#")[0]?.toLowerCase() ?? "";
  return path.endsWith(".svg");
}

/**
 * Next.js image optimizer returns 400 for URLs like `https://host//path`.
 * Catalog imports occasionally contain duplicate slashes after the hostname.
 */
export function normalizeRemoteImageUrl(url: string | undefined | null): string | undefined {
  if (url == null) return undefined;
  const trimmed = url.trim();
  if (!trimmed) return undefined;
  if (
    trimmed.startsWith("/") ||
    trimmed.startsWith("data:") ||
    trimmed.startsWith("blob:")
  ) {
    return trimmed;
  }
  try {
    const u = new URL(trimmed);
    const normalizedPath = u.pathname.replace(/\/{2,}/g, "/");
    if (normalizedPath === u.pathname) return trimmed;
    u.pathname = normalizedPath;
    return u.toString();
  } catch {
    return trimmed;
  }
}

/** Whether `src` is allowed by next/image config (otherwise use unoptimized or <img>). */
export function isAllowedNextImageSrc(src: string): boolean {
  const normalized = normalizeLocalMediaUrl(normalizeRemoteImageUrl(src) ?? src);
  if (!normalized || normalized.startsWith("data:") || normalized.startsWith("blob:")) {
    return false;
  }
  if (normalized.startsWith("/")) {
    return LOCAL_PREFIXES.some((prefix) => normalized.startsWith(prefix));
  }
  try {
    const u = new URL(normalized);
    if (u.protocol !== "https:" && u.protocol !== "http:") return false;
    const host = u.hostname.toLowerCase();
    if (REMOTE_HOSTS.has(host)) return true;
    if (host === "images.unsplash.com") return true;
    if (host === "utfs.io") return true;
    if (host === "uploadthing.com" || host.endsWith(".uploadthing.com")) return true;
    if (host === "developers.elementor.com") return true;
    if (host.endsWith(".supabase.co")) return true;
    return false;
  } catch {
    return false;
  }
}

/**
 * Whether next/image should run the server optimizer for `src`.
 * Catalog hosts (getic.com) must load directly — their CDN blocks or rate-limits
 * server-side fetches, which surfaces as 503 on `/_next/image`.
 */
export function shouldOptimizeNextImage(src: string): boolean {
  if (isLocalUploadUrl(src)) return false;
  if (isSvgMediaUrl(src)) return false;
  if (!isAllowedNextImageSrc(src)) return false;
  const normalized = normalizeRemoteImageUrl(src) ?? src;
  try {
    const host = new URL(normalized).hostname.toLowerCase();
    if (REMOTE_HOSTS.has(host)) return false;
  } catch {
    return false;
  }
  return true;
}
