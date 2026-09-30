import { getSiteUrl } from "@/config/site";
import { resolveSiteOrigin } from "@/features/seo/resolve-site-origin";
import { forceApexOrigin } from "@/lib/preferred-host";

/** Known production apex — last-resort sitemap origin when env/DB resolution fails. */
export const KNOWN_PRODUCTION_SITE_ORIGIN = "https://brt-me.com";

function toPublicSitemapOrigin(raw: string): string | null {
  const apex = forceApexOrigin(raw)?.replace(/\/$/, "");
  if (!apex) return null;
  try {
    const hostname = new URL(apex).hostname;
    if (!hostname || hostname === "localhost" || hostname === "127.0.0.1") return null;
    return apex;
  } catch {
    return null;
  }
}

/**
 * Deterministic origin for sitemap routes.
 * Prefer live resolveSiteOrigin, then NEXT_PUBLIC_SITE_URL / getSiteUrl(), then known production apex.
 * Always emits apex (non-www) HTTPS. Never invent an unrelated domain.
 */
export async function resolveSitemapOriginSafe(): Promise<string> {
  try {
    const resolved = (await resolveSiteOrigin("sitemap")).replace(/\/$/, "");
    const apex = toPublicSitemapOrigin(resolved);
    if (apex) return apex;
  } catch {
    // fall through to env
  }

  const fromEnv = process.env.NEXT_PUBLIC_SITE_URL?.trim() || getSiteUrl().trim();
  if (fromEnv) {
    const apex = toPublicSitemapOrigin(fromEnv);
    if (apex) return apex;
  }

  return KNOWN_PRODUCTION_SITE_ORIGIN;
}
