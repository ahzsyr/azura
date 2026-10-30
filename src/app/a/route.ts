import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  FALLBACK_LOCALE_PREFIXES,
  getLocaleRoutingCache,
} from "@/features/i18n/locale-middleware";
import {
  getCanonicalAppOrigin,
  resolveRequestOrigin,
} from "@/lib/oauth-redirect-origin";
import { resolveMarketingIngressAccess } from "@/modules/marketing/ingress-guard";
import { handleMarketingShortLink } from "@/modules/marketing/ingress/short-link";

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

/**
 * Short campaign link: /a?test
 * → sets first-party attribution cookie when marketing is runtime-active
 * → redirects to clean landing path (e.g. /en/products) with no query params
 *
 * Nested `/a/:id` is recognized by parsers/middleware but is not bound by
 * App Router here (`src/app/a/route.ts` matches `/a` only).
 */
export async function GET(request: NextRequest) {
  return handleMarketingShortLink(request, {
    resolveAccess: resolveMarketingIngressAccess,
    resolveRedirectOrigin: resolveShortLinkRedirectOrigin,
    getDefaultLocale: () => {
      const cache = getLocaleRoutingCache();
      return (
        cache?.defaultLocale ??
        cache?.locales?.[0] ??
        FALLBACK_LOCALE_PREFIXES[0] ??
        "en"
      );
    },
    findCampaignByInternalId: async (id) => {
      const campaign = await prisma.marketingCampaign
        .findFirst({
          where: { internalId: id },
          include: {
            trackingUrls: { orderBy: { createdAt: "asc" }, take: 1 },
          },
        })
        .catch(() => null);
      if (!campaign) return null;
      return {
        internalId: campaign.internalId,
        landingPagePath: campaign.landingPagePath,
        trackingUrls: campaign.trackingUrls,
      };
    },
  });
}
