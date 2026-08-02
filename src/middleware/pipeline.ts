import createMiddleware from "next-intl/middleware";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { augmentLocalesFromPathname, normalizeStackedLocalePathname } from "@/i18n/url-helpers";
import { handleAccountPath } from "@/features/account/account-middleware";
import {
  createSessionGetter,
  enforceComingSoonMode,
  handleComingSoonAntiLeak,
} from "@/features/coming-soon/coming-soon-gate";
import { getWiredCmsPageRedirect } from "@/features/cms/cms-page-path";
import {
  FALLBACK_LOCALE_PREFIXES,
  getLocaleRoutingCache,
  handleRetiredLocaleRedirect,
  resolveLocaleRouting,
} from "@/features/i18n/locale-middleware";
import {
  isCatalogAdminApi,
  isPublicMarketingPath,
  isSetupExemptPath,
  resolveSetupPath,
  resolveSetupStatus,
  resolveSetupStatusForCatalogApi,
} from "@/features/setup/setup-middleware";
import { lookupRedirect } from "@/features/seo/redirect-middleware";
import { handleAdminFastPath } from "@/lib/admin-middleware";
import { profileDisabledResponse } from "@/middleware/profile-gate";
import { isApiPathDisabled, isPublicPathDisabled } from "@/config/deployment-profile";

const LOCALE_PREFIX_ALWAYS = "always" as const;

export function middlewareFallback(request: NextRequest, error: unknown): NextResponse {
  console.error("[middleware] unhandled error:", error);
  const { pathname } = request.nextUrl;
  if (pathname.startsWith("/admin")) {
    return NextResponse.redirect(new URL("/admin/login", request.url));
  }
  return NextResponse.next();
}

export async function runMiddleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isPreviewRoute = pathname === "/preview" || pathname.startsWith("/preview/");
  const getSession = createSessionGetter(request);

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

  const retiredRedirect = handleRetiredLocaleRedirect(request);
  if (retiredRedirect) return retiredRedirect;

  const adminResponse = await handleAdminFastPath(request);
  if (adminResponse) return adminResponse;

  const setupStatusPromise = Promise.resolve(
    isCatalogAdminApi(pathname) || pathname.startsWith("/admin")
      ? resolveSetupStatusForCatalogApi()
      : resolveSetupStatus(request),
  );
  const localeRoutingPromise =
    pathname.startsWith("/api") || isPreviewRoute ? null : resolveLocaleRouting(request);
  const setupStatus = await setupStatusPromise;

  if (pathname.startsWith("/api") || isPreviewRoute) {
    if (isApiPathDisabled(pathname)) {
      return profileDisabledResponse();
    }
    const comingSoonBlock = await enforceComingSoonMode(
      request,
      setupStatus,
      isPreviewRoute,
      getSession,
      getLocaleRoutingCache()?.locales ?? [...FALLBACK_LOCALE_PREFIXES],
    );
    if (comingSoonBlock) return comingSoonBlock;
    return NextResponse.next();
  }

  const localeRouting = await localeRoutingPromise!;
  const { defaultLocale } = localeRouting;
  const locales = augmentLocalesFromPathname(pathname, localeRouting.locales);
  const canonicalPath = normalizeStackedLocalePathname(pathname, locales);
  const intlMiddleware = createMiddleware({
    locales,
    defaultLocale,
    localePrefix: LOCALE_PREFIX_ALWAYS,
  });

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

  const antiLeak = await handleComingSoonAntiLeak(
    request,
    setupStatus,
    pathname,
    localeRouting.locales,
    defaultLocale,
    getSession,
  );
  if (antiLeak) return antiLeak;

  if (setupCanonical) {
    if (setupCanonical !== pathname) {
      const url = request.nextUrl.clone();
      url.pathname = setupCanonical;
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  }

  if (!pathname.startsWith("/admin") && isPublicPathDisabled(pathname, locales)) {
    return profileDisabledResponse();
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

  const accountResponse = await handleAccountPath(
    request,
    pathname,
    locales,
    setupStatus,
    getSession,
    intlMiddleware,
  );
  if (accountResponse) return accountResponse;

  const wiredCmsRedirect = getWiredCmsPageRedirect(pathname, locales);
  if (wiredCmsRedirect) {
    const url = request.nextUrl.clone();
    url.pathname = wiredCmsRedirect;
    return NextResponse.redirect(url, 308);
  }

  if (canonicalPath) {
    const url = request.nextUrl.clone();
    url.pathname = canonicalPath;
    return NextResponse.redirect(url, 308);
  }

  return intlMiddleware(request);
}
