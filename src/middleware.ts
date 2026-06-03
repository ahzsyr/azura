import createMiddleware from "next-intl/middleware";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth.config";

const { auth } = NextAuth(authConfig);
import { routing } from "@/i18n/routing";
import { normalizeStackedLocalePathname } from "@/i18n/url-helpers";

type LocaleRoutingCache = {
  locales: string[];
  defaultLocale: string;
  expires: number;
};

let localeRoutingCache: LocaleRoutingCache | null = null;

async function resolveLocaleRouting(request: NextRequest) {
  const now = Date.now();
  if (localeRoutingCache && localeRoutingCache.expires > now) {
    return localeRoutingCache;
  }

  try {
    const lookupUrl = new URL("/api/locales", request.url);
    const res = await fetch(lookupUrl, { headers: { "x-middleware": "1" } });
    if (res.ok) {
      const data = (await res.json()) as { locales?: string[]; defaultLocale?: string };
      if (Array.isArray(data.locales) && data.locales.length > 0) {
        localeRoutingCache = {
          locales: data.locales,
          defaultLocale: data.defaultLocale ?? data.locales[0] ?? routing.defaultLocale,
          expires: now + 60_000,
        };
        return localeRoutingCache;
      }
    }
  } catch {
    // fall through to static routing
  }

  localeRoutingCache = {
    locales: [...routing.locales],
    defaultLocale: routing.defaultLocale,
    expires: now + 60_000,
  };
  return localeRoutingCache;
}

export default async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isPreviewRoute = pathname === "/preview" || pathname.startsWith("/preview/");

  if (
    !pathname.startsWith("/admin") &&
    !pathname.startsWith("/api") &&
    !pathname.startsWith("/_next") &&
    !isPreviewRoute
  ) {
    try {
      const lookupUrl = new URL(`/api/redirects?path=${encodeURIComponent(pathname)}`, request.url);
      const res = await fetch(lookupUrl, { headers: { "x-middleware": "1" } });
      if (res.ok) {
        const data = await res.json();
        if (data.redirect) {
          const url = request.nextUrl.clone();
          url.pathname = data.redirect.toPath;
          return NextResponse.redirect(url, data.redirect.type === "PERMANENT" ? 308 : 307);
        }
      }
    } catch {
      // continue without redirect
    }
  }

  if (pathname.startsWith("/admin")) {
    if (pathname === "/admin/login") {
      return NextResponse.next();
    }

    const session = await auth();
    if (!session?.user) {
      const loginUrl = new URL("/admin/login", request.url);
      loginUrl.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(loginUrl);
    }

    if (session.user.role !== "ADMIN") {
      return NextResponse.redirect(new URL("/admin/login", request.url));
    }

    return NextResponse.next();
  }

  if (
    pathname.startsWith("/api") ||
    pathname.startsWith("/_next") ||
    isPreviewRoute ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  const { locales, defaultLocale } = await resolveLocaleRouting(request);

  const canonicalPath = normalizeStackedLocalePathname(pathname, locales);
  if (canonicalPath) {
    const url = request.nextUrl.clone();
    url.pathname = canonicalPath;
    return NextResponse.redirect(url, 308);
  }

  const intlMiddleware = createMiddleware({
    locales,
    defaultLocale,
    localePrefix: routing.localePrefix,
  });

  return intlMiddleware(request);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api/auth|.*\\..*).*)"],
};
