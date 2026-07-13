import { normalizeLocalMediaUrl, normalizeRemoteImageUrl } from "@/lib/config/next-image";

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

/**
 * Resolves a stored or generated OG/Twitter image URL to a browser-loadable absolute URL.
 * Handles local paths, same-origin absolutes, protocol-relative URLs, and external catalog hosts.
 */
export function resolveSeoOgImageUrl(
  raw: string | undefined | null,
  siteUrl: string,
): string | undefined {
  if (!raw?.trim()) return undefined;

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
      const site = new URL(siteUrl);
      if (url.hostname === "localhost" || url.hostname === "127.0.0.1") {
        return `${site.origin}${url.pathname}${url.search}${url.hash}`;
      }
      // External hosts (e.g. catalog CDN) must keep full URL — never collapse to /images/...
      if (url.origin !== site.origin) {
        return url.href;
      }
      const localPath = normalizeLocalMediaUrl(value);
      if (localPath.startsWith("/")) {
        return `${site.origin}${localPath}`;
      }
      return url.href;
    } catch {
      return value;
    }
  }

  value = normalizeLocalMediaUrl(value);
  if (value.startsWith("/")) {
    return `${siteUrl.replace(/\/$/, "")}${value}`;
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
