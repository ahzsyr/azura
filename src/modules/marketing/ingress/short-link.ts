import { NextRequest, NextResponse } from "next/server";
import {
  buildCleanLandingUrl,
  CAMPAIGN_ENTRY_COOKIE,
  encodeCampaignEntryCookie,
  parseShortCampaignId,
  type CampaignEntryPayload,
} from "@/modules/marketing/tracking-urls/build-url";
import type { MarketingIngressDecision } from "@/modules/marketing/ingress-decision";

export type ShortLinkCampaign = {
  internalId: string;
  landingPagePath?: string | null;
  trackingUrls: Array<{
    baseUrl?: string | null;
    utmSource?: string | null;
    utmMedium?: string | null;
    utmCampaign?: string | null;
    utmContent?: string | null;
    utmTerm?: string | null;
  }>;
};

export type ShortLinkDeps = {
  resolveAccess: () => Promise<MarketingIngressDecision>;
  findCampaignByInternalId: (id: string) => Promise<ShortLinkCampaign | null>;
  getDefaultLocale: () => string;
  resolveRedirectOrigin: (request: NextRequest) => string;
};

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

function homeRedirect(origin: string): NextResponse {
  return NextResponse.redirect(new URL("/", origin), 302);
}

/**
 * Short-link handler for `GET /a` (query form `/a?id`).
 * Nested `/a/:id` is parsed by `parseShortCampaignId` but has no App Router
 * binding in this repository (`src/app/a/route.ts` only).
 */
export async function handleMarketingShortLink(
  request: NextRequest,
  deps: ShortLinkDeps,
): Promise<NextResponse> {
  const origin = deps.resolveRedirectOrigin(request);
  const access = await deps.resolveAccess();
  if (!access.allow) {
    return homeRedirect(origin);
  }

  const id = parseShortCampaignId({
    pathname: request.nextUrl.pathname,
    searchParams: request.nextUrl.searchParams,
  });
  if (!id) {
    return homeRedirect(origin);
  }

  const campaign = await deps.findCampaignByInternalId(id);
  const tracking = campaign?.trackingUrls[0];
  const landingPath = toLandingPath(
    campaign?.landingPagePath || tracking?.baseUrl || "/",
  );
  const cleanPath = buildCleanLandingUrl({
    baseUrl: landingPath,
    localePrefix: deps.getDefaultLocale(),
  });
  const redirectUrl = new URL(cleanPath || "/", origin);
  const campaignParam = campaign?.internalId ?? id;
  const cookiePayload: CampaignEntryPayload = {
    campaignParam,
    utmSource: tracking?.utmSource,
    utmMedium: tracking?.utmMedium,
    utmCampaign: tracking?.utmCampaign ?? campaignParam,
    utmContent: tracking?.utmContent,
    utmTerm: tracking?.utmTerm,
    entryUrl: `${origin}${request.nextUrl.pathname}${request.nextUrl.search}`,
    landingPagePath: redirectUrl.pathname,
  };

  const response = NextResponse.redirect(redirectUrl, 302);
  response.cookies.set({
    name: CAMPAIGN_ENTRY_COOKIE,
    value: encodeCampaignEntryCookie(cookiePayload),
    path: "/",
    maxAge: 60 * 30,
    sameSite: "lax",
    httpOnly: false,
    secure: redirectUrl.protocol === "https:",
  });
  return response;
}
