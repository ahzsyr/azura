import { themeRepository } from "@/repositories/theme.repository";
import { ThemeAdminClient } from "@/features/theme/components/theme-admin-client";
import { migrateBrandConfigFromHeaderIfNeeded } from "@/features/theme/theme-brand-migration";

export default async function ThemeAdminPage() {
  await migrateBrandConfigFromHeaderIfNeeded();
  const [draft, published] = await Promise.all([
    themeRepository.getDraft(),
    themeRepository.getPublished(),
  ]);

  return <ThemeAdminClient draft={draft} published={published} />;
}
