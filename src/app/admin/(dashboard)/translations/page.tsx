import { localeService } from "@/features/i18n/locale.service";
import { TranslationsDashboard } from "@/features/translation/components/translations-dashboard";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export default async function AdminTranslationsPage() {
  const locales = await localeService.listAll();
  return <TranslationsDashboard locales={locales} />;
}
