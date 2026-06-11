import { themeService } from "@/features/theme/theme.service";
import { getCompanyInfo } from "@/lib/data";
import { resolveSiteIdentity } from "@/lib/site-identity";

export type SiteBrandContext = {
  brandName: string;
  brandShort: string;
  tagline: string;
};

/** Resolves display brand from theme branding settings, then company / env defaults. */
export async function loadSiteBrandContext(): Promise<SiteBrandContext> {
  const [company, theme] = await Promise.all([
    getCompanyInfo(),
    themeService.getPublished(),
  ]);

  const brand = theme?.brandConfig;
  const identity = resolveSiteIdentity({
    companyName: company?.name,
    themeBrandName: brand?.brandName,
    themeTagline: brand?.tagline,
  });

  const brandShort =
    brand?.logoText?.trim() ||
    identity.brandShort ||
    identity.brandName.slice(0, 2).toUpperCase();

  return {
    brandName: identity.brandName,
    brandShort,
    tagline: identity.tagline,
  };
}
