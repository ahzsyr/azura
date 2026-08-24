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
  adminLifecycleDestination,
  isAdminLifecycleExemptPath,
} from "@/features/auth/admin-lifecycle";
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
  return requestHeaders;
}

/** Admin routes are destinations — not a separate authentication portal. */
export async function handleAdminFastPath(request: NextRequest): Promise<NextResponse | null> {
  const { pathname } = request.nextUrl;
  if (!pathname.startsWith("/admin")) return null;

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

    if (!isAdminLifecycleExemptPath(pathname)) {
      const block = adminLifecycleDestination({
        mustChangePassword: Boolean(
          (token as { mustChangePassword?: boolean }).mustChangePassword,
        ),
        totpEnabled: Boolean((token as { totpEnabled?: boolean }).totpEnabled),
      });
      if (block) {
        return NextResponse.redirect(new URL(block.redirectTo, request.url));
      }
    }

    if (isAdminPathDisabled(pathname)) {
      return profileDisabledResponse();
    }
    return NextResponse.next({
      request: { headers: withPathnameHeader(request) },
    });
  } catch (error) {
    console.error("[middleware] admin auth check failed:", error);
    const entry = resolveLoginEntryPath({ locale, callbackUrl: pathname });
    return NextResponse.redirect(new URL(entry, request.url));
  }
}
