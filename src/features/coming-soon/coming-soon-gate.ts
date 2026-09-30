import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import type { Session } from "next-auth";
import {
  COMING_SOON_PATH,
  isAnyComingSoonPath,
  isComingSoonExemptApi,
  isComingSoonExemptPage,
  isComingSoonPublicPath,
  resolveComingSoonCanonicalPath,
} from "@/features/coming-soon/coming-soon.middleware";
import { getAuthToken, tokenToSession } from "@/lib/auth.middleware";
import { isAdminRole } from "@/features/auth/portal";

export function shouldAllowSiteAccessForRole(options: {
  pathname: string;
  isAdmin: boolean;
  setupComplete: boolean;
  comingSoonEnabled: boolean;
  isPreviewRoute: boolean;
  locales?: string[];
}): boolean {
  const { pathname, isAdmin, setupComplete, comingSoonEnabled, isPreviewRoute, locales = [] } = options;

  if (!setupComplete) return true;
  if (isAdmin) return true;

  if (!comingSoonEnabled) {
    return !isAnyComingSoonPath(pathname, locales);
  }

  if (isComingSoonPublicPath(pathname)) return true;
  if (isComingSoonExemptPage(pathname, isPreviewRoute, locales)) return true;
  return false;
}

async function canAccessSiteDuringComingSoon(
  getSession: () => Promise<Session | null>,
): Promise<boolean> {
  const session = await getSession();
  return isAdminRole(session?.user?.role);
}

/**
 * After setup is complete, honor Site access “coming soon”.
 * Before setup, middleware already holds visitors on `/coming-soon`.
 */
export async function enforceComingSoonMode(
  request: NextRequest,
  setupStatus: { comingSoonEnabled: boolean; setupComplete?: boolean },
  isPreviewRoute: boolean,
  getSession: () => Promise<Session | null>,
  locales: string[] = [],
): Promise<NextResponse | null> {
  // Pre-setup holding page is handled separately in middleware.
  if (!setupStatus.setupComplete) return null;
  if (!setupStatus.comingSoonEnabled) return null;

  const { pathname } = request.nextUrl;
  if (await canAccessSiteDuringComingSoon(getSession)) {
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
  setupStatus: { comingSoonEnabled: boolean; setupComplete?: boolean },
  pathname: string,
  locales: string[],
  defaultLocale: string,
  getSession: () => Promise<Session | null>,
): Promise<NextResponse | null> {
  const isAdmin = await canAccessSiteDuringComingSoon(getSession);
  const allowed = shouldAllowSiteAccessForRole({
    pathname,
    isAdmin,
    setupComplete: Boolean(setupStatus.setupComplete),
    comingSoonEnabled: setupStatus.comingSoonEnabled,
    isPreviewRoute: false,
    locales,
  });

  // Pre-setup: keep /coming-soon as the public holding page.
  // Post-setup + live: bounce visitors away from /coming-soon to the site.
  // Post-setup + coming soon on: leave /coming-soon alone (enforcement sends visitors there).
  if (
    setupStatus.setupComplete &&
    !setupStatus.comingSoonEnabled &&
    isAnyComingSoonPath(pathname, locales) &&
    !isAdmin
  ) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    url.search = "";
    return NextResponse.redirect(url);
  }

  if (setupStatus.setupComplete && setupStatus.comingSoonEnabled && !allowed) {
    const url = request.nextUrl.clone();
    url.pathname = COMING_SOON_PATH;
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

  void defaultLocale;
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
