import { notFound } from "next/navigation";
import { fetchFaqSetWithItems } from "@/features/faq/actions";
import { FaqSetEditPage } from "@/features/faq/admin/faq-set-edit-page";
import { localeService } from "@/features/i18n/locale.service";
import { translationService } from "@/features/translation/translation.service";

type Props = { params: Promise<{ id: string }> };

export default async function AdminFaqSetEditPage({ params }: Props) {
  const { id } = await params;
  const [faqSet, locales, translations] = await Promise.all([
    fetchFaqSetWithItems(id),
    localeService.listEnabled(),
    translationService.getForEntity("FaqSet", id),
  ]);
  if (!faqSet) notFound();
  return <FaqSetEditPage faqSet={faqSet} locales={locales} translations={translations} />;
}
