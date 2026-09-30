import { themeRepository } from "@/repositories/theme.repository";
import { ThemeAdminClient } from "@/features/theme/components/theme-admin-client";
import { migrateBrandConfigFromHeaderIfNeeded } from "@/features/theme/theme-brand-migration";
import { ensureSiteThemeEffectColumns } from "@/features/theme/ensure-site-theme-effect-columns.server";
import { listChromePageOptions } from "@/features/theme/list-chrome-page-options.server";
import { readSiteSettings } from "@/features/catalog/site-settings.service";
import { resolvePageTransitions } from "@/features/preloader/resolve-page-transitions";

export default async function ThemeAdminPage() {
  await ensureSiteThemeEffectColumns();
  await migrateBrandConfigFromHeaderIfNeeded();

  const [draft, published, chromePages, siteSettings] = await Promise.all([
    themeRepository.getDraft(),
    themeRepository.getPublished(),
    listChromePageOptions(),
    readSiteSettings(),
  ]);

  const pageTransitions = resolvePageTransitions(siteSettings);

  return (
    <ThemeAdminClient
      draft={draft}
      published={published}
      chromePages={chromePages}
      pageTransitions={pageTransitions}
    />
  );
}
