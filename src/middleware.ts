import createMiddleware from "next-intl/middleware";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import NextAuth from "next-auth";
import type { Session } from "next-auth";
import { authConfig } from "@/lib/auth.config";

const { auth } = NextAuth(authConfig);
import { routing } from "@/i18n/routing";
import { normalizeStackedLocalePathname } from "@/i18n/url-helpers";
import {
  getCachedSetupStatus,
  setCachedSetupStatus,
  type SetupStatusCache,
} from "@/features/setup/setup-middleware-cache";
import {
  getComingSoonEnvOverride,
  getSetupCompleteEnvOverride,
} from "@/features/setup/setup-env-overrides";
import {
  SETUP_COMPLETE_COOKIE,
  hasSetupCompleteCookie,
} from "@/features/setup/setup-cookie";
import {
  COMING_SOON_BYPASS_COOKIE,
  COMING_SOON_PATH,
  getComingSoonBypassSecret,
  hasComingSoonBypassCookie,
  isComingSoonExemptApi,
  isComingSoonExemptPage,
  isComingSoonPublicPath,
  resolveComingSoonCanonicalPath,
} from "@/features/coming-soon/coming-soon.middleware";
import {
  isSupabaseConfigured,
  mergeSupabaseCookies,
  updateSession,
} from "@/utils/supabase/middleware";

type LocaleRoutingCache = {
  locales: string[];
  defaultLocale: string;
  expires: number;
};

let localeRoutingCache: LocaleRoutingCache | null = null;

type RedirectHit = { toPath: string; type: string } | null;

type RedirectCacheRow = {
  redirect: RedirectHit;
  expires: number;
};

const REDIRECT_CACHE_TTL_MS = 60_000;
const redirectLookupCache = new Map<string, RedirectCacheRow>();

function isCatalogAdminApi(pathname: string): boolean {
  return (
    pathname === "/api/collections" ||
    pathname.startsWith("/api/collections/") ||
    pathname === "/api/sync-collections"
  );
}

function resolveSetupStatusForCatalogApi(): SetupStatusCache {
  const cached = getCachedSetupStatus();
  if (cached) return cached;
  const envFallback = statusFromEnvFallback();
  if (envFallback) return envFallback;
  return setCachedSetupStatus({
    setupComplete: true,
    registrationEnabled: true,
    comingSoonEnabled: false,
    confident: true,
  });
}

function internalAppOrigin(): string {
  return (
    process.env.INTERNAL_APP_URL?.trim() ||
    `http://127.0.0.1:${process.env.PORT ?? 3000}`
  );
}

const SETUP_STATUS_FETCH_TIMEOUT_MS = 8_000;

function mergeSetupStatusWithEnvOverrides(
  status: Omit<SetupStatusCache, "expires">,
  options?: { fromApi?: boolean },
): SetupStatusCache {
  const setupEnv = getSetupCompleteEnvOverride();
  const comingSoonEnv = getComingSoonEnvOverride();

  let setupComplete = status.setupComplete;
  if (options?.fromApi && !status.setupComplete) {
    setupComplete = false;
  } else if (setupEnv !== null) {
    setupComplete = setupEnv;
  }

  return setCachedSetupStatus({
    setupComplete,
    registrationEnabled: status.registrationEnabled,
    comingSoonEnabled: comingSoonEnv ?? status.comingSoonEnabled,
    confident: status.confident,
  });
}

function statusFromEnvFallback(): SetupStatusCache | null {
  const setupEnv = getSetupCompleteEnvOverride();
  const comingSoonEnv = getComingSoonEnvOverride();
  if (setupEnv === null && comingSoonEnv === null) return null;
  return setCachedSetupStatus({
    setupComplete: setupEnv ?? false,
    registrationEnabled: true,
    comingSoonEnabled: comingSoonEnv ?? false,
    confident: setupEnv !== null || comingSoonEnv !== null,
  });
}

async function fetchSetupStatusFromApi(origin: string) {
  const url = new URL("/api/setup/status", origin);
  const res = await fetch(url, {
    headers: { "x-middleware": "1" },
    cache: "no-store",
    signal: AbortSignal.timeout(SETUP_STATUS_FETCH_TIMEOUT_MS),
  });
  if (!res.ok) return null;
  const data = (await res.json()) as {
    setupComplete?: boolean;
    registrationEnabled?: boolean;
    comingSoonEnabled?: boolean;
  };
  return mergeSetupStatusWithEnvOverrides(
    {
      setupComplete: Boolean(data.setupComplete),
      registrationEnabled: data.registrationEnabled !== false,
      comingSoonEnabled: Boolean(data.comingSoonEnabled),
      confident: true,
    },
    { fromApi: true },
  );
}

async function resolveSetupStatus(request: NextRequest) {
  const now = Date.now();
  const cached = getCachedSetupStatus(now);
  if (cached) {
    return cached;
  }

  const envFallback = statusFromEnvFallback();
  if (envFallback) {
    return envFallback;
  }

  if (hasSetupCompleteCookie(request.cookies.get(SETUP_COMPLETE_COOKIE)?.value)) {
    return mergeSetupStatusWithEnvOverrides({
      setupComplete: true,
      registrationEnabled: true,
      comingSoonEnabled: false,
      confident: true,
    });
  }

  const origins = [
    request.nextUrl.origin,
    internalAppOrigin(),
    `http://127.0.0.1:${process.env.PORT ?? 3000}`,
  ].filter((origin, index, list) => origin && list.indexOf(origin) === index);

  for (const origin of origins) {
    try {
      const status = await fetchSetupStatusFromApi(origin);
      if (status) return status;
    } catch {
      // try next origin (Hostinger self-fetch often needs localhost fallback)
    }
  }

  return {
    setupComplete: false,
    registrationEnabled: true,
    comingSoonEnabled: false,
    confident: false,
    expires: 0,
  };
}

async function lookupRedirect(pathname: string, request: NextRequest): Promise<RedirectHit> {
  const now = Date.now();
  const cached = redirectLookupCache.get(pathname);
  if (cached && cached.expires > now) {
    return cached.redirect;
  }

  const lookupUrl = new URL(`/api/redirects?path=${encodeURIComponent(pathname)}`, request.url);
  const res = await fetch(lookupUrl, { headers: { "x-middleware": "1" } });
  if (!res.ok) {
    redirectLookupCache.set(pathname, { redirect: null, expires: now + REDIRECT_CACHE_TTL_MS });
    return null;
  }

  const data = (await res.json()) as {
    redirect?: { toPath: string; type: string } | null;
  };
  const redirect = data.redirect ?? null;
  redirectLookupCache.set(pathname, { redirect, expires: now + REDIRECT_CACHE_TTL_MS });
  return redirect;
}

/** Public marketing paths that should not be blocked when setup status is uncertain. */
function isPublicMarketingPath(pathname: string, locales: string[]): boolean {
  if (pathname === "/") return true;
  for (const locale of locales) {
    if (pathname === `/${locale}` || pathname.startsWith(`/${locale}/`)) {
      return true;
    }
  }
  return false;
}

/** Paths reachable before setup is marked complete (avoids /setup ↔ /admin loops). */
function isSetupExemptPath(pathname: string): boolean {
  if (pathname.startsWith("/admin")) return true;
  if (pathname.startsWith("/api/setup")) return true;
  return false;
}

/** e.g. /en/account, /en/account/login */
function parseAccountPath(pathname: string, locales: string[]) {
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

function resolveLocaleRouting() {
  const now = Date.now();
  if (localeRoutingCache && localeRoutingCache.expires > now) {
    return localeRoutingCache;
  }

  localeRoutingCache = {
    locales: [...routing.locales],
    defaultLocale: routing.defaultLocale,
    expires: now + 60_000,
  };
  return localeRoutingCache;
}

/** Setup lives at /setup (not under [locale]). Detect /{locale}/setup from pathname shape only. */
function resolveSetupPath(pathname: string): { isSetup: boolean; canonical: string | null } {
  if (pathname === "/setup" || pathname.startsWith("/setup/")) {
    return { isSetup: true, canonical: pathname };
  }
  const match = pathname.match(/^\/([a-z0-9-]+)\/setup(\/.*)?$/i);
  if (match) {
    return { isSetup: true, canonical: `/setup${match[2] ?? ""}` };
  }
  return { isSetup: false, canonical: null };
}

function applyComingSoonBypassCookie(response: NextResponse, secret: string) {
  response.cookies.set(COMING_SOON_BYPASS_COOKIE, secret, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 30,
    path: "/",
  });
}

type MiddlewareSession = Session | null;

async function canAccessSiteDuringComingSoon(
  request: NextRequest,
  getSession: () => Promise<MiddlewareSession>,
): Promise<boolean> {
  const bypassCookie = request.cookies.get(COMING_SOON_BYPASS_COOKIE)?.value;
  if (hasComingSoonBypassCookie(bypassCookie)) return true;

  const session = await getSession();
  return session?.user?.role === "ADMIN";
}

/** Skip setup/locale probes — admin uses NextAuth, not Supabase. */
async function handleAdminFastPath(request: NextRequest): Promise<NextResponse | null> {
  const { pathname } = request.nextUrl;
  if (!pathname.startsWith("/admin")) return null;
  if (pathname === "/admin/login") return NextResponse.next();

  try {
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
  } catch (error) {
    console.error("[middleware] admin auth check failed:", error);
    return NextResponse.redirect(new URL("/admin/login", request.url));
  }
}

function middlewareFallback(request: NextRequest, error: unknown): NextResponse {
  console.error("[middleware] unhandled error:", error);
  const { pathname } = request.nextUrl;
  if (pathname.startsWith("/admin")) {
    return NextResponse.redirect(new URL("/admin/login", request.url));
  }
  return NextResponse.next();
}

async function enforceComingSoonMode(
  request: NextRequest,
  setupStatus: { comingSoonEnabled: boolean },
  isPreviewRoute: boolean,
  getSession: () => Promise<MiddlewareSession>,
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

function needsSupabaseSession(pathname: string): boolean {
  return pathname.includes("/account") && !pathname.startsWith("/admin");
}

async function runMiddleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isPreviewRoute = pathname === "/preview" || pathname.startsWith("/preview/");
  let sessionCache: MiddlewareSession | null = null;
  let sessionLoaded = false;
  const getSession = async () => {
    if (!sessionLoaded) {
      sessionCache = await auth();
      sessionLoaded = true;
    }
    return sessionCache;
  };

  // Internal lookups invoked by middleware — must bypass to avoid recursive fetches.
  if (
    pathname === "/api/setup/status" ||
    pathname === "/api/setup/reconcile" ||
    pathname === "/api/locales" ||
    pathname.startsWith("/api/redirects")
  ) {
    return NextResponse.next();
  }

  if (pathname.startsWith("/_next") || pathname.includes(".")) {
    return NextResponse.next();
  }

  const adminResponse = await handleAdminFastPath(request);
  if (adminResponse) return adminResponse;

  const setupStatus = isCatalogAdminApi(pathname) || pathname.startsWith("/admin")
    ? resolveSetupStatusForCatalogApi()
    : await resolveSetupStatus(request);

  if (pathname.startsWith("/api") || isPreviewRoute) {
    const comingSoonBlock = await enforceComingSoonMode(
      request,
      setupStatus,
      isPreviewRoute,
      getSession,
      [...routing.locales],
    );
    if (comingSoonBlock) return comingSoonBlock;
    return NextResponse.next();
  }

  const localeRouting = resolveLocaleRouting();

  const { isSetup: isSetupPath, canonical: setupCanonical } = resolveSetupPath(pathname);

  if (!setupStatus.setupComplete) {
    if (!isSetupPath && !isSetupExemptPath(pathname)) {
      const blockSetup =
        setupStatus.confident || !isPublicMarketingPath(pathname, localeRouting.locales);
      if (blockSetup) {
        const url = request.nextUrl.clone();
        url.pathname = "/setup";
        url.search = "";
        return NextResponse.redirect(url);
      }
    }
  } else if (isSetupPath) {
    const session = await getSession();
    const url = request.nextUrl.clone();
    if (session?.user?.role === "ADMIN") {
      url.pathname = "/admin";
      url.search = "";
    } else {
      url.pathname = `/${localeRouting.defaultLocale}`;
      url.search = "";
    }
    return NextResponse.redirect(url);
  }

  const comingSoonBlock = await enforceComingSoonMode(
    request,
    setupStatus,
    isPreviewRoute,
    getSession,
    localeRouting.locales,
  );
  if (comingSoonBlock) return comingSoonBlock;

  const comingSoonCanonical = resolveComingSoonCanonicalPath(pathname, localeRouting.locales);
  if (comingSoonCanonical) {
    const url = request.nextUrl.clone();
    url.pathname = comingSoonCanonical;
    return NextResponse.redirect(url, 308);
  }

  if (isComingSoonPublicPath(pathname)) {
    return NextResponse.next();
  }

  if (setupCanonical) {
    if (setupCanonical !== pathname) {
      const url = request.nextUrl.clone();
      url.pathname = setupCanonical;
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  }

  if (!pathname.startsWith("/admin") && !isSetupPath) {
    try {
      const redirect = await lookupRedirect(pathname, request);
      if (redirect) {
        const url = request.nextUrl.clone();
        url.pathname = redirect.toPath;
        return NextResponse.redirect(url, redirect.type === "PERMANENT" ? 308 : 307);
      }
    } catch {
      // continue without redirect
    }
  }

  const { locales, defaultLocale } = localeRouting;

  const accountPath = parseAccountPath(pathname, locales);
  if (accountPath) {
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
      const intlMiddleware = createMiddleware({
        locales,
        defaultLocale,
        localePrefix: routing.localePrefix,
      });
      return intlMiddleware(request);
    }

    const isPublicAccountHub = sub === "";

    if (!session?.user) {
      if (isPublicAccountHub) {
        const intlMiddleware = createMiddleware({
          locales,
          defaultLocale,
          localePrefix: routing.localePrefix,
        });
        return intlMiddleware(request);
      }
      const loginUrl = new URL(`/${accountPath.locale}/account/login`, request.url);
      loginUrl.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(loginUrl);
    }

    const intlMiddleware = createMiddleware({
      locales,
      defaultLocale,
      localePrefix: routing.localePrefix,
    });
    return intlMiddleware(request);
  }

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

export default async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const skipSupabase =
    pathname.startsWith("/admin") ||
    pathname.startsWith("/api/auth") ||
    !needsSupabaseSession(pathname);

  let supabaseResponse: NextResponse | null = null;
  if (!skipSupabase && isSupabaseConfigured()) {
    try {
      supabaseResponse = await updateSession(request);
    } catch (error) {
      console.error("[middleware] supabase session skipped:", error);
    }
  }

  try {
    const response = await runMiddleware(request);
    if (supabaseResponse) {
      return mergeSupabaseCookies(supabaseResponse, response);
    }
    return response;
  } catch (error) {
    return middlewareFallback(request, error);
  }
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api/auth|.*\\..*).*)"],
};
