import { localeService } from "@/features/i18n/locale.service";
import { translationService } from "@/features/translation/translation.service";
import { LanguagesAdmin } from "@/features/i18n/components/languages-admin";
import { AdminPageHeader } from "@/components/admin/layout/admin-shell";

export const dynamic = "force-dynamic";

export default async function AdminLanguagesPage() {
  const locales = await localeService.listAll();
  const completionByLocale: Record<string, number> = {};

  await Promise.all(
    locales.map(async (locale) => {
      completionByLocale[locale.code] = await translationService.getOverallCompletionForLocale(
        locale.code
      );
    })
  );

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Languages"
        description="Manage enabled locales, default language, and RTL/LTR settings. URL prefix controls public paths; code controls messages JSON files."
      />
      <LanguagesAdmin locales={locales} completionByLocale={completionByLocale} />
    </div>
  );
}
