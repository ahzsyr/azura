import { getSiteUrl } from "@/config/site";
import { getCanonicalAppOrigin, getServerAppOrigin } from "@/lib/oauth-redirect-origin";
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
 * - background / sitemap / publish jobs: NEXT_PUBLIC_SITE_URL, then canonical env fallback
 */
export async function resolveSiteOrigin(context: SiteOriginContext): Promise<string> {
  if (context === "admin-preview" || context === "public") {
    return getServerAppOrigin();
  }
  return originFromEnv();
}

/** Hostname for social preview cards (no protocol). */
export function siteOriginToDomain(origin: string): string {
  try {
    return new URL(origin).hostname;
  } catch {
    return "localhost";
  }
}
