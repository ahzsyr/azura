import { readSiteSettings } from "@/features/catalog/site-settings.service";
import { PreloaderAdminClient } from "@/features/preloader/preloader-admin-client";
import { resolveSitePreloader } from "@/features/preloader/resolve-site-preloader";
import { themeService } from "@/features/theme/theme.service";

export const metadata = {
  title: "Preloader",
};

export default async function PreloaderAdminPage() {
  const [siteSettings, theme] = await Promise.all([
    readSiteSettings(),
    themeService.getPublished(),
  ]);

  const resolved = resolveSitePreloader(siteSettings, {
    themeLogoUrl: theme?.logoUrl,
  });

  const { resolvedLogoUrl: _logo, ...initialSettings } = resolved;

  return (
    <PreloaderAdminClient
      initialSettings={initialSettings}
      themeLogoUrl={theme?.logoUrl ?? null}
    />
  );
}
