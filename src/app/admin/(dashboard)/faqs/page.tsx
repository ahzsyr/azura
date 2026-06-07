import { prisma } from "@/lib/prisma";
import { FaqSetManager } from "@/features/faq/admin/faq-set-manager";
import type { FaqSetAdmin } from "@/features/faq/types";

export default async function AdminFaqsPage() {
  let faqSets: FaqSetAdmin[] = [];
  try {
    const rows = await prisma.faqSet.findMany({
      orderBy: { sortOrder: "asc" },
      include: {
        _count: { select: { items: true } },
      },
    });

    faqSets = rows.map((row) => ({
      id: row.id,
      slug: row.slug,
      titleEn: row.titleEn,
      titleAr: row.titleAr,
      excerptEn: row.excerptEn,
      excerptAr: row.excerptAr,
      descriptionEn: row.descriptionEn,
      descriptionAr: row.descriptionAr,
      sortOrder: row.sortOrder,
      isPublished: row.isPublished,
      itemCount: row._count.items,
    }));
  } catch {
    // DB not connected
  }

  return <FaqSetManager faqSets={faqSets} />;
}
