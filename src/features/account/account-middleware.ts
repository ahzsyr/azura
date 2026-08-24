import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import type { Session } from "next-auth";
import {
  isAdminRole,
  resolveLoginEntryPath,
  resolvePostLoginRedirect,
} from "@/features/auth/portal";

type IntlMiddleware = (request: NextRequest) => NextResponse | Promise<NextResponse>;

/** e.g. /en/account, /en/account/login */
export function parseAccountPath(pathname: string, locales: string[]) {
  for (const locale of locales) {
    const prefix = `/${locale}/account`;
    if (pathname === prefix || pathname.startsWith(`${prefix}/`)) {
      const rest = pathname.slice(prefix.length) || "/";
      const sub = rest === "/" ? "" : rest.replace(/^\//, "");
      return { locale, sub };
    }
  }
  return null;
}

export function needsSupabaseSession(pathname: string): boolean {
  return pathname.includes("/account") && !pathname.startsWith("/admin");
}

type SetupStatusSlice = { registrationEnabled: boolean };

export async function handleAccountPath(
  request: NextRequest,
  pathname: string,
  locales: string[],
  setupStatus: SetupStatusSlice,
  getSession: () => Promise<Session | null>,
  intlMiddleware: IntlMiddleware,
): Promise<NextResponse | null> {
  const accountPath = parseAccountPath(pathname, locales);
  if (!accountPath) return null;

  const { sub, locale } = accountPath;
  const isAuthPage =
    sub === "login" ||
    sub === "register" ||
    sub === "forgot-password" ||
    sub === "reset-password" ||
    sub === "verify-email" ||
    sub === "accept-invite";

  if (sub === "register" && !setupStatus.registrationEnabled) {
    const entry = resolveLoginEntryPath({ locale, callbackUrl: null });
    return NextResponse.redirect(new URL(entry, request.url));
  }

  const session = await getSession();
  const role = session?.user?.role;

  // Admins never use the customer account portal as a destination
  if (session?.user && isAdminRole(role)) {
    const dest = resolvePostLoginRedirect({
      role,
      locale,
      callbackUrl: null,
    });
    return NextResponse.redirect(new URL(dest, request.url));
  }

  if (isAuthPage) {
    if (session?.user) {
      const dest = resolvePostLoginRedirect({
        role,
        locale,
        callbackUrl: request.nextUrl.searchParams.get("callbackUrl"),
      });
      return NextResponse.redirect(new URL(dest, request.url));
    }
    return intlMiddleware(request);
  }

  const isPublicAccountHub = sub === "";

  if (!session?.user) {
    if (isPublicAccountHub) {
      return intlMiddleware(request);
    }
    const entry = resolveLoginEntryPath({
      locale,
      callbackUrl: pathname,
    });
    return NextResponse.redirect(new URL(entry, request.url));
  }

  return intlMiddleware(request);
}
