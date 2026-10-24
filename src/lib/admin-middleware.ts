import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { isAdminPathDisabled } from "@/config/deployment-profile";
import { profileDisabledResponse } from "@/middleware/profile-gate";
import { getAuthToken, isAdminToken } from "@/lib/auth.middleware";
import {
  isAdminRole,
  resolveLoginEntryPath,
  resolvePortalLocale,
  resolvePostLoginRedirect,
} from "@/features/auth/portal";
import {
  FALLBACK_LOCALE_PREFIXES,
  getLocaleRoutingCache,
} from "@/features/i18n/locale-middleware";

function portalLocaleFromRequest(request: NextRequest): string {
  const locales =
    getLocaleRoutingCache()?.locales ?? [...FALLBACK_LOCALE_PREFIXES];
  return resolvePortalLocale({
    pathname: request.nextUrl.pathname,
    cookieLocale:
      request.cookies.get("NEXT_LOCALE")?.value ??
      request.cookies.get("NEXT_LOCALE".toLowerCase())?.value,
    locales,
  });
}

function withPathnameHeader(request: NextRequest): Headers {
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-admin-pathname", request.nextUrl.pathname);
  // Save and router.refresh() are client requests. The layout must not
  // redirect those, or the admin leaves the page and section they just saved.
  // Stamp our own header: Next may strip rsc / next-action before the layout.
  if (
    request.headers.get("next-action") ||
    request.headers.get("rsc") === "1" ||
    request.headers.get("next-url")
  ) {
    requestHeaders.set("x-admin-client-refresh", "1");
  }
  return requestHeaders;
}

/** Admin routes are destinations — not a separate authentication portal. */
export async function handleAdminFastPath(request: NextRequest): Promise<NextResponse | null> {
  const { pathname } = request.nextUrl;
  if (!pathname.startsWith("/admin")) return null;
  if (isAdminPathDisabled(pathname)) return profileDisabledResponse();

  const locale = portalLocaleFromRequest(request);

  try {
    const token = await getAuthToken(request);
    const role = token?.role as string | undefined;

    // /admin/login: compatibility redirect only
    if (pathname === "/admin/login") {
      if (token && isAdminRole(role)) {
        const dest = resolvePostLoginRedirect({
          role,
          locale,
          callbackUrl: request.nextUrl.searchParams.get("callbackUrl"),
        });
        return NextResponse.redirect(new URL(dest, request.url));
      }
      if (token && !isAdminRole(role)) {
        const dest = resolvePostLoginRedirect({ role, locale, callbackUrl: null });
        return NextResponse.redirect(new URL(dest, request.url));
      }
      const entry = resolveLoginEntryPath({
        locale,
        callbackUrl: request.nextUrl.searchParams.get("callbackUrl"),
      });
      return NextResponse.redirect(new URL(entry, request.url));
    }

    if (!token) {
      const entry = resolveLoginEntryPath({
        locale,
        callbackUrl: pathname,
      });
      return NextResponse.redirect(new URL(entry, request.url));
    }

    if (!isAdminToken(token)) {
      const dest = resolvePostLoginRedirect({
        role,
        locale,
        callbackUrl: null,
      });
      return NextResponse.redirect(new URL(dest, request.url));
    }

    // Lifecycle (password change, OTP sender) is enforced in the dashboard
    // layout against the database. The edge JWT is stale after a password
    // change or after an Email Account is saved, and redirecting here traps
    // the browser on /admin/settings/account before that check can run.
    return NextResponse.next({
      request: { headers: withPathnameHeader(request) },
    });
  } catch (error) {
    console.error("[middleware] admin auth check failed:", error);
    const entry = resolveLoginEntryPath({ locale, callbackUrl: pathname });
    return NextResponse.redirect(new URL(entry, request.url));
  }
}
