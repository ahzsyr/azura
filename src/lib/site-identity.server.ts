import "server-only";

import { getCompanyInfo } from "@/lib/data";
import { themeService } from "@/features/theme/theme.service";
import { resolveSiteIdentity, resolveThemeBrandName } from "@/lib/site-identity";

/** Load brand name from company + published theme for metadata titles. */
export async function resolveSiteIdentityFromDb() {
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
