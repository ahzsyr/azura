import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  buildCleanLandingUrl,
  CAMPAIGN_ENTRY_COOKIE,
  encodeCampaignEntryCookie,
  parseShortCampaignId,
} from "@/modules/marketing/tracking-urls/build-url";
import {
  FALLBACK_LOCALE_PREFIXES,
  getLocaleRoutingCache,
} from "@/features/i18n/locale-middleware";
import {
  getCanonicalAppOrigin,
  resolveRequestOrigin,
} from "@/lib/oauth-redirect-origin";

export const runtime = "nodejs";

function isBindAllOrLoopbackHost(hostname: string): boolean {
  const host = hostname.toLowerCase();
  return (
    host === "0.0.0.0" ||
    host === "::" ||
    host === "[::]" ||
    host === "localhost" ||
    host === "127.0.0.1" ||
    host === "::1"
  );
}

/**
 * Never redirect visitors to the container bind address (0.0.0.0) or an
 * internal request URL. Prefer proxy Host / x-forwarded-*, then public env.
 */
function resolveShortLinkRedirectOrigin(request: NextRequest): string {
  const candidates = [resolveRequestOrigin(request), getCanonicalAppOrigin()];
  const parsed: URL[] = [];
  for (const candidate of candidates) {
    try {
      const url = new URL(candidate);
      if (url.hostname.toLowerCase() === "0.0.0.0" || url.hostname === "::") continue;
      parsed.push(url);
    } catch {
      /* skip */
    }
  }

  const publicOrigin = parsed.find((url) => !isBindAllOrLoopbackHost(url.hostname));
  if (publicOrigin) return publicOrigin.origin;
  if (parsed[0]) return parsed[0].origin;
  return getCanonicalAppOrigin();
}

/** Landing paths may be stored absolute; always redirect with a relative path. */
function toLandingPath(raw: string): string {
  const trimmed = raw.trim() || "/";
  if (!/^https?:\/\//i.test(trimmed)) {
    return trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
  }
  try {
    return new URL(trimmed).pathname || "/";
  } catch {
    return "/";
  }
}

/**
 * Short campaign link: /a?test
 * → sets first-party attribution cookie
 * → redirects to clean landing path (e.g. /en/products) with no query params
 */
export async function GET(request: NextRequest) {
  const id = parseShortCampaignId({
    pathname: request.nextUrl.pathname,
    searchParams: request.nextUrl.searchParams,
  });

  if (!id) {
    return NextResponse.redirect(new URL("/", resolveShortLinkRedirectOrigin(request)), 302);
  }

  const campaign = await prisma.marketingCampaign
    .findFirst({
      where: { internalId: id },
      include: {
        trackingUrls: { orderBy: { createdAt: "asc" }, take: 1 },
      },
    })
    .catch(() => null);

  const tracking = campaign?.trackingUrls[0];
  const landingPath = toLandingPath(
    campaign?.landingPagePath || tracking?.baseUrl || "/",
  );

  const cache = getLocaleRoutingCache();
  const defaultLocale =
    cache?.defaultLocale ?? cache?.locales?.[0] ?? FALLBACK_LOCALE_PREFIXES[0] ?? "en";

  // Path only — host comes from the visitor-facing origin (never request.url / 0.0.0.0)
  const cleanPath = buildCleanLandingUrl({
    baseUrl: landingPath,
    localePrefix: defaultLocale,
  });

  const redirectOrigin = resolveShortLinkRedirectOrigin(request);
  const redirectUrl = new URL(cleanPath || "/", redirectOrigin);

  const campaignParam = campaign?.internalId ?? id;
  const response = NextResponse.redirect(redirectUrl, 302);
  response.cookies.set({
    name: CAMPAIGN_ENTRY_COOKIE,
    value: encodeCampaignEntryCookie({
      campaignParam,
      utmSource: tracking?.utmSource,
      utmMedium: tracking?.utmMedium,
      utmCampaign: tracking?.utmCampaign ?? campaignParam,
      utmContent: tracking?.utmContent,
      utmTerm: tracking?.utmTerm,
      entryUrl: `${redirectOrigin}${request.nextUrl.pathname}${request.nextUrl.search}`,
      landingPagePath: redirectUrl.pathname,
    }),
    path: "/",
    maxAge: 60 * 30, // 30 minutes — consumed on first page load
    sameSite: "lax",
    httpOnly: false, // client attribution bootstrap must read it
    secure: redirectUrl.protocol === "https:",
  });

  return response;
}
