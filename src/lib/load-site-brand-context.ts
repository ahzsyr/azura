import { themeService } from "@/features/theme/theme.service";
import { getCompanyInfo } from "@/lib/data";
import { resolveSiteIdentity } from "@/lib/site-identity";

export type SiteBrandContext = {
  brandName: string;
};

/** Resolves display brand from theme branding settings, then company / env defaults. */
export async function loadSiteBrandContext(): Promise<SiteBrandContext> {
  const [company, theme] = await Promise.all([
    getCompanyInfo(),
    themeService.getPublished(),
  ]);

  const { brandName } = resolveSiteIdentity({
    companyName: company?.name,
    themeBrandName: theme?.brandConfig?.brandName,
    themeTagline: theme?.brandConfig?.tagline,
  });

  return { brandName };
}
