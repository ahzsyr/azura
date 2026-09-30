import {
  COMING_SOON_PATH,
} from "@/features/coming-soon/coming-soon.constants";
import { publicLocalePath } from "@/i18n/url-helpers";

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
  // Public login must remain reachable so operators can sign in during coming-soon
  for (const locale of locales) {
    const loginPath = publicLocalePath(locale, "/account/login");
    if (pathname === loginPath || pathname.startsWith(`${loginPath}/`)) {
      return true;
    }
    const verifyPath = publicLocalePath(locale, "/account/verify-email");
    if (pathname === verifyPath || pathname.startsWith(`${verifyPath}/`)) {
      return true;
    }
    const invitePath = publicLocalePath(locale, "/account/accept-invite");
    if (pathname === invitePath || pathname.startsWith(`${invitePath}/`)) {
      return true;
    }
  }
  return false;
}

export function isComingSoonExemptApi(pathname: string): boolean {
  return (
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/api/setup") ||
    pathname.startsWith("/api/debug") ||
    pathname.startsWith("/api/coming-soon") ||
    pathname.startsWith("/api/auth")
  );
}

export { COMING_SOON_PATH };
