import "server-only";

import { cache } from "react";
import { getCompanyInfo } from "@/lib/data";
import { resolvePublishedSiteTheme } from "@/lib/theme/resolve-site-theme.server";
import { resolveSiteIdentity, resolveThemeBrandName } from "@/lib/site-identity";

/** Request-cached brand identity from company + published theme for metadata titles. */
export const resolveSiteIdentityFromDb = cache(async () => {
  const [company, resolved] = await Promise.all([
    getCompanyInfo().catch(() => null),
    resolvePublishedSiteTheme().catch(() => null),
  ]);
  const theme = resolved?.tokens ?? null;
  return resolveSiteIdentity({
    companyName: company?.name,
    themeBrandName: resolveThemeBrandName(theme?.brandConfig),
    themeTagline: theme?.brandConfig?.tagline,
  });
});
