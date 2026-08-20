import { themeRepository } from "@/repositories/theme.repository";
import { ThemeAdminClient } from "@/features/theme/components/theme-admin-client";
import { migrateBrandConfigFromHeaderIfNeeded } from "@/features/theme/theme-brand-migration";
import { ensureSiteThemeEffectColumns } from "@/features/theme/ensure-site-theme-effect-columns.server";
import { listChromePageOptions } from "@/features/theme/list-chrome-page-options.server";

export default async function ThemeAdminPage() {
  await ensureSiteThemeEffectColumns();
  await migrateBrandConfigFromHeaderIfNeeded();

  const [draft, published, chromePages] = await Promise.all([
    themeRepository.getDraft(),
    themeRepository.getPublished(),
    listChromePageOptions(),
  ]);

  return <ThemeAdminClient draft={draft} published={published} chromePages={chromePages} />;
}
