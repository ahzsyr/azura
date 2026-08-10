import { prisma } from "@/lib/prisma";
import { localeService } from "@/features/i18n/locale.service";
import { loadLegacyEntityShape } from "@/features/portal/lib/portal-translation";
import { Custom404SettingsClient } from "@/features/seo/admin/custom-404-settings-client";

export default async function Custom404AdminPage() {
  const locales = await localeService.listEnabled();
  const defaultLocale = locales.find((l) => l.isDefault) ?? locales[0];
  let row = await prisma.custom404.findUnique({ where: { locale: defaultLocale.code } });
  if (!row) {
    row = await prisma.custom404.create({
      data: { locale: defaultLocale.code, blocks: [] },
    });
  }

  const legacyEntity = await loadLegacyEntityShape("Custom404", row.id, ["title", "body"]);

  return (
    <Custom404SettingsClient
      custom404Id={row.id}
      defaultLocaleCode={defaultLocale.code}
      legacyEntity={legacyEntity}
    />
  );
}
