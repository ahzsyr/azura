import "server-only";

import { getSiteUrl } from "@/config/site";
import { getCanonicalAppOrigin, getServerAppOrigin } from "@/lib/oauth-redirect-origin";
import { resolvePublicSiteUrl } from "@/features/seo/site-url-resolver";
import { siteUrlToDomain } from "@/features/seo/site-url-utils";
import type { SiteOriginContext } from "@/features/seo/site-origin.types";

function originFromEnv(): string {
  const configured = getSiteUrl().trim();
  if (configured && configured !== "http://localhost:3000") {
    try {
      return new URL(configured.replace(/\/$/, "") || configured).origin;
    } catch {
      // fall through
    }
  }
  return getCanonicalAppOrigin();
}

/**
 * Single source for site origin across SEO surfaces.
 *
 * - admin-preview / public: request host (multi-domain admin + live preview)
 * - background / sitemap / publish jobs: SiteUrlResolver (never localhost in SEO output)
 */
export async function resolveSiteOrigin(context: SiteOriginContext): Promise<string> {
  if (context === "admin-preview" || context === "public") {
    const requestOrigin = await getServerAppOrigin();
    try {
      const hostname = new URL(requestOrigin).hostname;
      if (hostname !== "localhost" && hostname !== "127.0.0.1") {
        return requestOrigin;
      }
    } catch {
      // fall through to resolver
    }
  }
  if (context === "sitemap" || context === "background") {
    return resolvePublicSiteUrl();
  }
  return originFromEnv();
}

/** Hostname for social preview cards (no protocol). */
export function siteOriginToDomain(origin: string): string {
  return siteUrlToDomain(origin);
}
