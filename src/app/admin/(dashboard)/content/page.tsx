import { notFound } from "next/navigation";
import { ContentHubPage } from "@/features/content/admin/content-hub-page";
import { contentService } from "@/features/content/content.service";
import { contentRepository } from "@/features/content/content.repository";
import { loadAdminRowsWithLocalizedFields } from "@/features/translation/admin-entity-helpers";

export const dynamic = "force-dynamic";

export default async function AdminContentHubPage() {
  await contentService.ensureReady();
  const rows = await contentRepository.listTypes();
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
  return <ContentHubPage types={types} />;
}
