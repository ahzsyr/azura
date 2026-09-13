import { getCmsPagePublicPath } from "@/features/cms/cms-page-path";
import { stripAnyLocalePrefix } from "@/i18n/url-helpers";

export type InternalNavTarget = {
  path: string;
  search: string;
  hash: string;
};

/** Locale-neutral path (+ optional query/hash) for App Router navigation. */
export function normalizeInternalNavHref(href: string, origin = "https://local"): string {
  const url = new URL(href, origin);
  let neutralPath = stripAnyLocalePrefix(url.pathname);
  const pagesMatch = neutralPath.match(/^\/pages\/([^/]+)\/?$/);
  if (pagesMatch?.[1]) {
    neutralPath = getCmsPagePublicPath(pagesMatch[1]);
  }
  const path = neutralPath.replace(/\/$/, "") || "/";
  return `${path}${url.search}${url.hash}`;
}

export function parseInternalNavTarget(href: string, origin = "https://local"): InternalNavTarget {
  const normalized = normalizeInternalNavHref(href, origin);
  const url = new URL(normalized, origin);
  return {
    path: url.pathname.replace(/\/$/, "") || "/",
    search: url.search,
    hash: url.hash,
  };
}

/** True when href resolves to the same path, query, and hash as the current location. */
export function isSameInternalNavTarget(
  href: string,
  pathname: string,
  search = "",
  hash = "",
  origin = "https://local",
): boolean {
  const target = parseInternalNavTarget(href, origin);
  const currentPath = stripAnyLocalePrefix(pathname).replace(/\/$/, "") || "/";
  return target.path === currentPath && target.search === search && target.hash === hash;
}

export function isInternalNavigationLink(anchor: HTMLAnchorElement): boolean {
  const href = anchor.getAttribute("href");
  if (!href || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:")) {
    return false;
  }
  if (anchor.target === "_blank" || anchor.hasAttribute("download")) return false;
  try {
    const url = new URL(href, window.location.origin);
    return url.origin === window.location.origin;
  } catch {
    return href.startsWith("/");
  }
}

export function getInternalLinkPath(anchor: HTMLAnchorElement): string | null {
  const href = anchor.getAttribute("href");
  if (!href) return null;
  const [pathPart] = href.split("#");
  return pathPart || null;
}

export function findInternalNavAnchor(event: MouseEvent): HTMLAnchorElement | null {
  if (event.defaultPrevented || event.button !== 0) return null;
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return null;

  const target = event.target;
  if (!(target instanceof Element)) return null;
  const anchor = target.closest("a[href]");
  if (!(anchor instanceof HTMLAnchorElement)) return null;
  if (!isInternalNavigationLink(anchor)) return null;
  return anchor;
}
