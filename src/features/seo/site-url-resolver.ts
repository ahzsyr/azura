import "server-only";

import { getSiteUrl } from "@/config/site";
import { getCanonicalAppOrigin } from "@/lib/oauth-redirect-origin";
import { resolveSiteIdentityFromDb } from "@/lib/site-identity.server";
import { resolvePublishedSiteTheme } from "@/lib/theme/resolve-site-theme.server";
import { seoRepository } from "@/repositories/seo.repository";

import { isLocalhostHost, siteUrlToDomain } from "@/features/seo/site-url-utils";
import { forceApexOrigin, parsePreferredApexSiteUrl } from "@/lib/preferred-host";

function normalizeOrigin(url: string): string | null {
  try {
    const normalized = url.trim().startsWith("http") ? url.trim() : `https://${url.trim()}`;
    const parsed = new URL(normalized);
    if (isLocalhostHost(parsed.hostname)) return null;
    return forceApexOrigin(parsed.origin) ?? parsed.origin;
  } catch {
    return null;
  }
}

/**
 * Align candidate origin to configured preferred host, always emitting apex (non-www).
 * Admin integration siteUrl may store www — rewrite to apex before SEO emission.
 */
function alignToConfiguredHost(origin: string): string {
  const preferred = parsePreferredApexSiteUrl(process.env.NEXT_PUBLIC_SITE_URL);
  if (preferred) {
    try {
      const candidateHost = new URL(origin).hostname.toLowerCase().replace(/^www\./, "");
      if (candidateHost === preferred.hostname) return preferred.origin;
    } catch {
      // keep candidate
    }
  }
  return forceApexOrigin(origin) ?? origin;
}

/** Website / integration settings domain (primary SEO URL source). */
export async function resolveWebsiteSettingsDomain(): Promise<string | null> {
  try {
    const config = await seoRepository.getIntegrationsConfig();
    const candidates = [
      config?.google?.siteUrl,
      config?.bing?.siteUrl,
      config?.indexnow?.siteUrl,
    ];
    for (const candidate of candidates) {
      const origin = candidate ? normalizeOrigin(candidate) : null;
      if (origin) return origin;
    }
  } catch {
    // ignore — fall through to env
  }
  return null;
}

/**
 * Central resolver for public SEO URLs.
 * Priority: website settings domain → NEXT_PUBLIC_SITE_URL → canonical env (never localhost).
 * www/apex form is aligned to NEXT_PUBLIC_SITE_URL when both are the same site.
 */
export async function resolvePublicSiteUrl(): Promise<string> {
  const settingsDomain = await resolveWebsiteSettingsDomain();
  if (settingsDomain) return alignToConfiguredHost(settingsDomain);

  const envOrigin = normalizeOrigin(getSiteUrl());
  if (envOrigin) return alignToConfiguredHost(envOrigin);

  const canonical = normalizeOrigin(getCanonicalAppOrigin());
  if (canonical) return alignToConfiguredHost(canonical);

  const identity = await resolveSiteIdentityFromDb();
  if (identity.domain && !isLocalhostHost(identity.domain)) {
    return alignToConfiguredHost(`https://${identity.domain}`);
  }

  const forcedEnv = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  const forcedOrigin = forcedEnv ? normalizeOrigin(forcedEnv) : null;
  if (forcedOrigin) return alignToConfiguredHost(forcedOrigin);

  return getCanonicalAppOrigin().replace(/\/$/, "");
}

export async function resolveSiteLogoUrl(): Promise<string | null> {
  try {
    const resolved = await resolvePublishedSiteTheme();
    const tokens = resolved?.tokens;
    const logo =
      tokens?.logoUrl?.trim() ||
      tokens?.brandConfig?.logoImageLightUrl?.trim() ||
      tokens?.brandConfig?.logoImageDarkUrl?.trim();
    return logo || null;
  } catch {
    return null;
  }
}


export const siteUrlResolver = {
  resolvePublicSiteUrl,
  resolveWebsiteSettingsDomain,
  resolveSiteLogoUrl,
  siteUrlToDomain,
};
