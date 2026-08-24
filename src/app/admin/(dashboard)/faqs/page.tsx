import { prisma } from "@/lib/prisma";
import { FaqSetManager } from "@/features/faq/admin/faq-set-manager";
import type { FaqSetAdmin } from "@/features/faq/types";
import { localeService } from "@/features/i18n/locale.service";
import { loadAdminRowsWithLocalizedFields } from "@/features/translation/admin-entity-helpers";
import { readAdminLocaleField } from "@/features/translation/admin-localized-view";

function isMissingCoverUrlColumn(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  const code = (error as { code?: string })?.code;
  return (
    /coverUrl/i.test(message) &&
    (code === "P2022" ||
      /does not exist|Unknown column|no such column|column .* coverUrl/i.test(message))
  );
}

export default async function AdminFaqsPage({
  searchParams,
}: {
  searchParams: Promise<{ create?: string }>;
}) {
  const { create } = await searchParams;
  let faqSets: FaqSetAdmin[] = [];
  const locales = await localeService.listEnabled();
  try {
    let rows: Array<{
      id: string;
      slug: string;
      coverUrl: string | null;
      sortOrder: number;
      isPublished: boolean;
      _count: { items: number };
    }>;
    try {
      rows = await prisma.faqSet.findMany({
        orderBy: { sortOrder: "asc" },
        select: {
          id: true,
          slug: true,
          coverUrl: true,
          sortOrder: true,
          isPublished: true,
          _count: { select: { items: true } },
        },
      });
    } catch (selectError) {
      if (!isMissingCoverUrlColumn(selectError)) throw selectError;
      const fallback = await prisma.faqSet.findMany({
        orderBy: { sortOrder: "asc" },
        select: {
          id: true,
          slug: true,
          sortOrder: true,
          isPublished: true,
          _count: { select: { items: true } },
        },
      });
      rows = fallback.map((row) => ({ ...row, coverUrl: null }));
    }

    const withTranslations = await loadAdminRowsWithLocalizedFields("FaqSet", rows, [
      "title",
      "subtitle",
      "excerpt",
      "description",
    ]);

    faqSets = withTranslations.map((row) => ({
      id: row.id,
      slug: row.slug,
      displayTitle: row.displayTitle,
      titleEn: row.displayTitle,
      titleAr: readAdminLocaleField(row, "title", "ar"),
      excerptEn: readAdminLocaleField(row, "subtitle", "en") || readAdminLocaleField(row, "excerpt", "en") || null,
      excerptAr: readAdminLocaleField(row, "subtitle", "ar") || readAdminLocaleField(row, "excerpt", "ar") || null,
      descriptionEn: readAdminLocaleField(row, "description", "en"),
      descriptionAr: readAdminLocaleField(row, "description", "ar"),
      coverUrl: row.coverUrl,
      sortOrder: row.sortOrder,
      isPublished: row.isPublished,
      itemCount: row._count.items,
    }));
  } catch {
    // DB not connected or schema unavailable
  }

  return <FaqSetManager faqSets={faqSets} locales={locales} initialCreateOpen={create === "1"} />;
}
