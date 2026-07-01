import { prisma } from "@/lib/prisma";
import { FaqSetManager } from "@/features/faq/admin/faq-set-manager";
import type { FaqSetAdmin } from "@/features/faq/types";
import { loadAdminRowsWithLocalizedFields } from "@/features/translation/admin-entity-helpers";
import { readAdminLocaleField } from "@/features/translation/admin-localized-view";

export default async function AdminFaqsPage() {
  let faqSets: FaqSetAdmin[] = [];
  try {
    const rows = await prisma.faqSet.findMany({
      orderBy: { sortOrder: "asc" },
      include: {
        _count: { select: { items: true } },
      },
    });

    const withTranslations = await loadAdminRowsWithLocalizedFields("FaqSet", rows, [
      "title",
      "subtitle",
      "description",
    ]);

    faqSets = withTranslations.map((row) => ({
      id: row.id,
      slug: row.slug,
      displayTitle: row.displayTitle,
      titleEn: row.displayTitle,
      titleAr: readAdminLocaleField(row, "title", "ar"),
      excerptEn: readAdminLocaleField(row, "subtitle", "en") || null,
      excerptAr: readAdminLocaleField(row, "subtitle", "ar") || null,
      descriptionEn: readAdminLocaleField(row, "description", "en"),
      descriptionAr: readAdminLocaleField(row, "description", "ar"),
      sortOrder: row.sortOrder,
      isPublished: row.isPublished,
      itemCount: row._count.items,
    }));
  } catch {
    // DB not connected
  }

  return <FaqSetManager faqSets={faqSets} />;
}
