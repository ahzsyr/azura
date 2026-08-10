import { prisma } from "@/lib/prisma";
import { ContentTypesListPage } from "@/features/content/admin/content-type-form";
import { loadAdminRowsWithLocalizedFields } from "@/features/translation/admin-entity-helpers";

export const dynamic = "force-dynamic";

export default async function AdminContentTypesPage() {
  const rows = await prisma.contentType.findMany({
    orderBy: { sortOrder: "asc" },
    include: { _count: { select: { items: true } } },
  });
  const withTranslations = await loadAdminRowsWithLocalizedFields(
    "ContentType",
    rows,
    ["name", "labelSingular", "labelPlural"],
    "labelPlural"
  );
  const types = withTranslations.map((row) => ({
    ...row,
    labelPluralEn: row.displayTitle,
  }));
  return <ContentTypesListPage types={types} />;
}
