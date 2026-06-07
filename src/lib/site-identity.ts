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

/** Read brand name from theme brandConfig (supports legacy `name` alias). */
export function resolveThemeBrandName(
  brandConfig?: { brandName?: string | null; name?: string | null } | null
): string | undefined {
  const canonical = brandConfig?.brandName?.trim();
  if (canonical) return canonical;
  return brandConfig?.name?.trim() || undefined;
}

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

/** Load brand name from company + published theme for metadata titles. */
export async function resolveSiteIdentityFromDb() {
  const { getCompanyInfo } = await import("@/lib/data");
  const { themeService } = await import("@/features/theme/theme.service");
  const [company, theme] = await Promise.all([
    getCompanyInfo().catch(() => null),
    themeService.getPublished().catch(() => null),
  ]);
  return resolveSiteIdentity({
    companyName: company?.name,
    themeBrandName: resolveThemeBrandName(theme?.brandConfig),
    themeTagline: theme?.brandConfig?.tagline,
  });
}
