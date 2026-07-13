import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import type { Session } from "next-auth";

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

  const { sub } = accountPath;
  const isAuthPage =
    sub === "login" ||
    sub === "register" ||
    sub === "forgot-password" ||
    sub === "reset-password";

  if (sub === "register" && !setupStatus.registrationEnabled) {
    const url = request.nextUrl.clone();
    url.pathname = `/${accountPath.locale}/account/login`;
    return NextResponse.redirect(url);
  }

  const session = await getSession();

  if (isAuthPage) {
    if (session?.user) {
      const dest = `/${accountPath.locale}/account`;
      return NextResponse.redirect(new URL(dest, request.url));
    }
    return intlMiddleware(request);
  }

  const isPublicAccountHub = sub === "";

  if (!session?.user) {
    if (isPublicAccountHub) {
      return intlMiddleware(request);
    }
    const loginUrl = new URL(`/${accountPath.locale}/account/login`, request.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return intlMiddleware(request);
}
