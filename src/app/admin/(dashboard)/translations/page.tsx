import { localeService } from "@/features/i18n/locale.service";
import { translationService } from "@/features/translation/translation.service";
import { TranslationsDashboard } from "@/features/translation/components/translations-dashboard";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function AdminTranslationsPage() {
  const locales = await prisma.localeConfig.findMany({
    orderBy: [{ sortOrder: "asc" }, { code: "asc" }],
  });
  const enabled = await localeService.listEnabled();
  const nonDefault = enabled.filter((l) => !l.isDefault);

  const [completionMatrix, priorityMissing] = await Promise.all([
    translationService.getCompletionMatrix(nonDefault.map((l) => l.code)),
    translationService.findPriorityMissing(30),
  ]);

  return (
    <TranslationsDashboard
      locales={locales}
      completionMatrix={completionMatrix}
      priorityMissing={priorityMissing}
    />
  );
}
