import {
  COMING_SOON_BYPASS_COOKIE,
  COMING_SOON_PATH,
} from "@/features/coming-soon/coming-soon.constants";

export function getComingSoonBypassSecret(): string | null {
  const secret = process.env.COMING_SOON_BYPASS_SECRET?.trim();
  return secret || null;
}

export function hasComingSoonBypassCookie(cookieValue: string | undefined): boolean {
  const secret = getComingSoonBypassSecret();
  if (!secret || !cookieValue) return false;
  return cookieValue === secret;
}

export function isComingSoonPublicPath(pathname: string): boolean {
  return pathname === COMING_SOON_PATH || pathname.startsWith(`${COMING_SOON_PATH}/`);
}

export function isAnyComingSoonPath(pathname: string, locales: string[] = []): boolean {
  return (
    isComingSoonPublicPath(pathname) ||
    resolveComingSoonCanonicalPath(pathname, locales) !== null
  );
}

/** Maps /{locale}/coming-soon → /coming-soon (page is not under [locale]). */
export function resolveComingSoonCanonicalPath(
  pathname: string,
  locales: string[],
): string | null {
  if (isComingSoonPublicPath(pathname)) return null;
  for (const locale of locales) {
    const prefix = `/${locale}/coming-soon`;
    if (pathname === prefix) return COMING_SOON_PATH;
    if (pathname.startsWith(`${prefix}/`)) {
      return `${COMING_SOON_PATH}${pathname.slice(prefix.length)}`;
    }
  }
  return null;
}

export function isComingSoonExemptPage(
  pathname: string,
  isPreviewRoute: boolean,
  locales: string[] = [],
): boolean {
  if (isComingSoonPublicPath(pathname)) return true;
  if (resolveComingSoonCanonicalPath(pathname, locales)) return true;
  if (isPreviewRoute) return true;
  if (pathname === "/setup" || pathname.startsWith("/setup/")) return true;
  if (pathname.startsWith("/admin")) return true;
  return false;
}

export function isComingSoonExemptApi(pathname: string): boolean {
  return (
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/api/setup") ||
    pathname.startsWith("/api/coming-soon") ||
    pathname === "/api/collections" ||
    pathname.startsWith("/api/collections/") ||
    pathname === "/api/sync-collections"
  );
}

export { COMING_SOON_BYPASS_COOKIE, COMING_SOON_PATH };
