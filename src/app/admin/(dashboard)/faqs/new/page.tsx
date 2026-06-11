import { FaqSetCreatePage } from "@/features/faq/admin/faq-set-create-page";
import { localeService } from "@/features/i18n/locale.service";

export default async function AdminFaqsNewPage() {
  const locales = await localeService.listEnabled();
  return <FaqSetCreatePage locales={locales} />;
}
