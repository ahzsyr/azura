import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import type { Session } from "next-auth";
import {
  COMING_SOON_BYPASS_COOKIE,
  COMING_SOON_PATH,
  getComingSoonBypassSecret,
  hasComingSoonBypassCookie,
  isAnyComingSoonPath,
  isComingSoonExemptApi,
  isComingSoonExemptPage,
  isComingSoonPublicPath,
  resolveComingSoonCanonicalPath,
} from "@/features/coming-soon/coming-soon.middleware";
import { getAuthToken, tokenToSession } from "@/lib/auth.middleware";

function applyComingSoonBypassCookie(response: NextResponse, secret: string) {
  response.cookies.set(COMING_SOON_BYPASS_COOKIE, secret, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 30,
    path: "/",
  });
}

async function canAccessSiteDuringComingSoon(
  request: NextRequest,
  getSession: () => Promise<Session | null>,
): Promise<boolean> {
  const bypassCookie = request.cookies.get(COMING_SOON_BYPASS_COOKIE)?.value;
  if (hasComingSoonBypassCookie(bypassCookie)) return true;

  const session = await getSession();
  return session?.user?.role === "ADMIN";
}

export async function enforceComingSoonMode(
  request: NextRequest,
  setupStatus: { comingSoonEnabled: boolean },
  isPreviewRoute: boolean,
  getSession: () => Promise<Session | null>,
  locales: string[] = [],
): Promise<NextResponse | null> {
  if (!setupStatus.comingSoonEnabled) return null;

  const { pathname } = request.nextUrl;
  const bypassSecret = getComingSoonBypassSecret();
  const bypassParam = request.nextUrl.searchParams.get("bypass");

  if (bypassSecret && bypassParam === bypassSecret) {
    const destination = isComingSoonPublicPath(pathname)
      ? COMING_SOON_PATH
      : pathname;
    const url = request.nextUrl.clone();
    url.pathname = destination;
    url.searchParams.delete("bypass");
    const response = NextResponse.redirect(url);
    applyComingSoonBypassCookie(response, bypassSecret);
    return response;
  }

  if (await canAccessSiteDuringComingSoon(request, getSession)) {
    return null;
  }

  if (pathname.startsWith("/api")) {
    if (isComingSoonExemptApi(pathname)) return null;
    return NextResponse.json({ error: "Site is not available yet." }, { status: 503 });
  }

  if (isComingSoonExemptPage(pathname, isPreviewRoute, locales)) {
    return null;
  }

  const url = request.nextUrl.clone();
  url.pathname = COMING_SOON_PATH;
  url.search = "";
  return NextResponse.redirect(url);
}

export async function handleComingSoonAntiLeak(
  request: NextRequest,
  setupStatus: { comingSoonEnabled: boolean },
  pathname: string,
  locales: string[],
  defaultLocale: string,
  getSession: () => Promise<Session | null>,
): Promise<NextResponse | null> {
  if (
    !setupStatus.comingSoonEnabled &&
    isAnyComingSoonPath(pathname, locales) &&
    !(await canAccessSiteDuringComingSoon(request, getSession))
  ) {
    const url = request.nextUrl.clone();
    url.pathname = `/${defaultLocale}`;
    url.search = "";
    return NextResponse.redirect(url);
  }

  const comingSoonCanonical = resolveComingSoonCanonicalPath(pathname, locales);
  if (comingSoonCanonical) {
    const url = request.nextUrl.clone();
    url.pathname = comingSoonCanonical;
    return NextResponse.redirect(url, 308);
  }

  if (isComingSoonPublicPath(pathname)) {
    return NextResponse.next();
  }

  return null;
}

export function createSessionGetter(request: NextRequest) {
  let sessionCache: Session | null = null;
  let sessionLoaded = false;
  return async () => {
    if (!sessionLoaded) {
      sessionCache = tokenToSession(await getAuthToken(request));
      sessionLoaded = true;
    }
    return sessionCache;
  };
}
