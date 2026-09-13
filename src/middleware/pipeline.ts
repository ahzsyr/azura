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
  resolveSetupStatusForPublicMarketing,
} from "@/features/setup/setup-middleware";
import { lookupRedirect } from "@/features/seo/redirect-middleware";
import { handleAdminFastPath } from "@/lib/admin-middleware";
import { profileDisabledResponse } from "@/middleware/profile-gate";
import { isApiPathDisabled, isPublicPathDisabled } from "@/config/deployment-profile";
import {
  buildPreferredHostRedirectUrl,
  forceApexOrigin,
  resolveWwwApexRedirect,
} from "@/lib/preferred-host";
import {
  isAdminRole,
  resolveLoginEntryPath,
  resolvePortalLocale,
  resolvePostLoginRedirect,
} from "@/features/auth/portal";

const LOCALE_PREFIX_AS_NEEDED = "as-needed" as const;

/** Permanent redirect legacy /{defaultLocale} URLs to unprefixed public URLs. */
function handleLegacyDefaultLocalePrefixRedirect(
  request: NextRequest,
  defaultLocale: string,
): NextResponse | null {
  const { pathname } = request.nextUrl;
  const prefix = `/${defaultLocale}`;
  if (pathname === prefix) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url, 308);
  }
  if (pathname.startsWith(`${prefix}/`)) {
    const url = request.nextUrl.clone();
    url.pathname = pathname.slice(prefix.length) || "/";
    return NextResponse.redirect(url, 308);
  }
  return null;
}

/** Heuristic before locale routing resolves — uses cache or fallback prefixes. */
function isPublicMarketingPathGuess(pathname: string): boolean {
  const locales = getLocaleRoutingCache()?.locales ?? [...FALLBACK_LOCALE_PREFIXES];
  return isPublicMarketingPath(pathname, locales);
}

export function middlewareFallback(request: NextRequest, error: unknown): NextResponse {
  console.error("[middleware] unhandled error:", error);
  const { pathname } = request.nextUrl;
  if (pathname.startsWith("/admin")) {
    const locales = getLocaleRoutingCache()?.locales ?? [...FALLBACK_LOCALE_PREFIXES];
    const locale = resolvePortalLocale({
      pathname,
      cookieLocale: request.cookies.get("NEXT_LOCALE")?.value,
      locales,
    });
    const entry = resolveLoginEntryPath({
      locale,
      callbackUrl: pathname === "/admin/login" ? null : pathname,
    });
    return NextResponse.redirect(new URL(entry, request.url));
  }
  return NextResponse.next();
}

export async function runMiddleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isPreviewRoute = pathname === "/preview" || pathname.startsWith("/preview/");
  const isCampaignShortLink = pathname === "/a" || pathname.startsWith("/a/");
  const getSession = createSessionGetter(request);

  const hostRedirect = resolveWwwApexRedirect(
    forceApexOrigin(process.env.NEXT_PUBLIC_SITE_URL) ?? process.env.NEXT_PUBLIC_SITE_URL,
    request.headers.get("x-forwarded-host") ?? request.headers.get("host"),
  );
  if (hostRedirect) {
    return NextResponse.redirect(
      buildPreferredHostRedirectUrl(
        hostRedirect.toOrigin,
        pathname,
        request.nextUrl.search,
      ),
      308,
    );
  }

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
      : isPublicMarketingPathGuess(pathname)
        ? resolveSetupStatusForPublicMarketing(request)
        : resolveSetupStatus(request),
  );
  const localeRoutingPromise =
    pathname.startsWith("/api") || isPreviewRoute || isCampaignShortLink
      ? null
      : resolveLocaleRouting(request);
  const setupStatus = await setupStatusPromise;

  if (pathname.startsWith("/api") || isPreviewRoute || isCampaignShortLink) {
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
    localePrefix: LOCALE_PREFIX_AS_NEEDED,
    localeDetection: false,
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
    if (session?.user && isAdminRole(session.user.role)) {
      url.pathname = resolvePostLoginRedirect({
        role: session.user.role,
        locale: localeRouting.defaultLocale,
        callbackUrl: null,
      });
      url.search = "";
    } else {
      url.pathname = "/";
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
    defaultLocale,
  );
  if (accountResponse) return accountResponse;

  const wiredCmsRedirect = getWiredCmsPageRedirect(pathname, locales, defaultLocale);
  if (wiredCmsRedirect) {
    const url = request.nextUrl.clone();
    url.pathname = wiredCmsRedirect;
    return NextResponse.redirect(url, 308);
  }

  const legacyPrefixRedirect = handleLegacyDefaultLocalePrefixRedirect(request, defaultLocale);
  if (legacyPrefixRedirect) return legacyPrefixRedirect;

  if (canonicalPath) {
    const url = request.nextUrl.clone();
    url.pathname = canonicalPath;
    return NextResponse.redirect(url, 308);
  }

  const intlResponse = intlMiddleware(request);
  // next-intl uses 307 for some locale redirects; upgrade to 308 when consolidating away from default prefix.
  if (intlResponse.status === 307) {
    const location = intlResponse.headers.get("location");
    if (location) {
      const target = new URL(location, request.url);
      const targetPath = target.pathname.replace(/\/$/, "") || "/";
      const defaultPrefix = `/${defaultLocale}`;
      const requestPath = pathname.replace(/\/$/, "") || "/";
      const isRedirectToDefaultPrefix =
        targetPath === defaultPrefix || targetPath.startsWith(`${defaultPrefix}/`);
      const requestIsPublicUnprefixed =
        requestPath === "/" ||
        !locales.some(
          (l) => requestPath === `/${l}` || requestPath.startsWith(`/${l}/`),
        );
      // Never redirect unprefixed public URLs to /{defaultLocale}; rewrite internally instead.
      if (isRedirectToDefaultPrefix && requestIsPublicUnprefixed) {
        const rewriteUrl = request.nextUrl.clone();
        rewriteUrl.pathname = targetPath;
        const rewrite = NextResponse.rewrite(rewriteUrl);
        for (const cookie of intlResponse.cookies.getAll()) {
          rewrite.cookies.set(cookie);
        }
        return rewrite;
      }
      const redirect = NextResponse.redirect(target, 308);
      for (const cookie of intlResponse.cookies.getAll()) {
        redirect.cookies.set(cookie);
      }
      return redirect;
    }
  }

  return intlResponse;
}
