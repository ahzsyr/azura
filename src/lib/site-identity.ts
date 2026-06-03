import {
  DEFAULT_BRAND_NAME,
  DEFAULT_BRAND_SHORT,
  DEFAULT_TAGLINE,
  getPublicBrandName,
  getPublicBrandShort,
  getPublicTagline,
  getSiteDomain,
} from "@/config/site";

export type SiteIdentity = {
  brandName: string;
  brandShort: string;
  tagline: string;
  domain: string;
};

export type SiteIdentityInput = {
  companyName?: string | null;
  themeBrandName?: string | null;
  themeTagline?: string | null;
};

/**
 * Resolve display identity: theme brand → company name → env → AZURA default.
 */
export function resolveSiteIdentity(input: SiteIdentityInput = {}): SiteIdentity {
  const brandName =
    input.themeBrandName?.trim() ||
    input.companyName?.trim() ||
    getPublicBrandName() ||
    DEFAULT_BRAND_NAME;

  const tagline =
    input.themeTagline?.trim() || getPublicTagline() || DEFAULT_TAGLINE;

  return {
    brandName,
    brandShort: getPublicBrandShort() || DEFAULT_BRAND_SHORT,
    tagline,
    domain: getSiteDomain(),
  };
}

/** Sync fallback when DB is unavailable (metadata builders, static defaults). */
export function getDefaultSiteIdentity(): SiteIdentity {
  return resolveSiteIdentity();
}
