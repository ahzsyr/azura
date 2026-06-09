import { readSiteSettings } from "@/features/catalog/site-settings.service";
import { PreloaderAdminClient } from "@/features/preloader/preloader-admin-client";
import { resolveSitePreloader } from "@/features/preloader/resolve-site-preloader";
import { parseBrandConfig } from "@/features/theme/theme-config";
import { themeService } from "@/features/theme/theme.service";
import "@/styles/site-preloader.css";

export const metadata = {
  title: "Preloader",
};

export default async function PreloaderAdminPage() {
  const [siteSettings, theme] = await Promise.all([
    readSiteSettings(),
    themeService.getPublished(),
  ]);

  const brandConfig = parseBrandConfig(
    theme && "brandConfig" in theme ? (theme as { brandConfig?: unknown }).brandConfig : {},
  );

  const resolved = resolveSitePreloader(siteSettings, {
    themeLogoUrl: theme?.logoUrl,
    brandLogoLightUrl: brandConfig.logoImageLightUrl ?? brandConfig.logoImageUrl,
    brandLogoDarkUrl: brandConfig.logoImageDarkUrl,
  });

  const { resolvedLogoUrl: _logo, ...initialSettings } = resolved;

  return (
    <PreloaderAdminClient
      initialSettings={initialSettings}
      themeLogoUrl={theme?.logoUrl ?? null}
      brandLogoLightUrl={brandConfig.logoImageLightUrl ?? brandConfig.logoImageUrl ?? null}
      brandLogoDarkUrl={brandConfig.logoImageDarkUrl ?? null}
    />
  );
}
