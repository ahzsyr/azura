import { normalizeLocalMediaUrl, normalizeRemoteImageUrl } from "@/lib/config/next-image";
import { forceApexOrigin } from "@/lib/preferred-host";

const LOCAL_PATH_PREFIXES = ["uploads/", "images/", "assets/"] as const;

export function isAbsoluteHttpUrl(url: string): boolean {
  return /^https?:\/\//i.test(url.trim());
}

function isProtocolRelativeUrl(url: string): boolean {
  return url.startsWith("//");
}

function looksLikeBareHostname(url: string): boolean {
  return /^[\w.-]+\.[a-z]{2,}(\/|$)/i.test(url);
}

function apexSiteOrigin(siteUrl: string): string {
  return (forceApexOrigin(siteUrl) ?? siteUrl).replace(/\/$/, "");
}

/**
 * Resolves a stored or generated OG/Twitter image URL to a browser-loadable absolute URL.
 * Handles local paths, same-origin absolutes, protocol-relative URLs, and external catalog hosts.
 * Always emits apex (non-www) for same-site media URLs.
 */
export function resolveSeoOgImageUrl(
  raw: string | undefined | null,
  siteUrl: string,
): string | undefined {
  if (!raw?.trim()) return undefined;

  const siteOrigin = apexSiteOrigin(siteUrl);
  let value = raw.trim();

  if (isProtocolRelativeUrl(value)) {
    value = `https:${value}`;
  } else if (
    !isAbsoluteHttpUrl(value) &&
    !value.startsWith("/") &&
    !value.startsWith("data:") &&
    !value.startsWith("blob:")
  ) {
    if (looksLikeBareHostname(value)) {
      value = `https://${value}`;
    } else if (LOCAL_PATH_PREFIXES.some((prefix) => value.startsWith(prefix))) {
      value = `/${value}`;
    }
  }

  value = normalizeRemoteImageUrl(value) ?? value;

  if (isAbsoluteHttpUrl(value)) {
    try {
      const url = new URL(value);
      const site = new URL(siteOrigin);
      if (url.hostname === "localhost" || url.hostname === "127.0.0.1") {
        return `${site.origin}${url.pathname}${url.search}${url.hash}`;
      }
      const urlHost = url.hostname.replace(/^www\./, "");
      const siteHost = site.hostname.replace(/^www\./, "");
      // Same registrable host (www/apex twin) → apex site origin + path
      if (urlHost === siteHost) {
        const localPath = normalizeLocalMediaUrl(value);
        if (localPath.startsWith("/")) {
          return `${site.origin}${localPath}`;
        }
        return `${site.origin}${url.pathname}${url.search}${url.hash}`;
      }
      // External hosts (e.g. catalog CDN) must keep full URL
      return url.href;
    } catch {
      return value;
    }
  }

  value = normalizeLocalMediaUrl(value);
  if (value.startsWith("/")) {
    return `${siteOrigin}${value}`;
  }

  return value;
}

/** Whether the URL is non-empty and likely loadable in OG/Twitter previews. */
export function isUsableOgImageUrl(url: string | undefined | null, siteUrl?: string): boolean {
  if (!url?.trim()) return false;
  const resolved = siteUrl
    ? resolveSeoOgImageUrl(url, siteUrl)
    : resolveSeoOgImageUrl(url, "https://example.com");
  if (!resolved) return false;
  return (
    isAbsoluteHttpUrl(resolved) ||
    resolved.startsWith("/") ||
    resolved.startsWith("data:") ||
    resolved.startsWith("blob:")
  );
}
