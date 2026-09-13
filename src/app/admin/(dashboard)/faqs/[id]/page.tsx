import { notFound } from "next/navigation";
import { fetchFaqSetWithItems } from "@/features/faq/actions";
import { FaqSetEditPage } from "@/features/faq/admin/faq-set-edit-page";
import { localeService } from "@/features/i18n/locale.service";

type Props = { params: Promise<{ id: string }> };

export default async function AdminFaqSetEditPage({ params }: Props) {
  const { id } = await params;
  const [faqSet, locales] = await Promise.all([
    fetchFaqSetWithItems(id),
    localeService.listEnabled(),
  ]);
  if (!faqSet) notFound();
  return (
    <FaqSetEditPage faqSet={faqSet} locales={locales} translations={faqSet.translations} />
  );
}
