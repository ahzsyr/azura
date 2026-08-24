import { ContentHubPage, type HubCollection, type HubContentType } from "@/features/content/admin/content-hub-page";
import { contentService } from "@/features/content/content.service";
import { contentRepository } from "@/features/content/content.repository";
import { loadAdminRowsWithLocalizedFields } from "@/features/translation/admin-entity-helpers";

export const dynamic = "force-dynamic";

export default async function AdminContentHubPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  await contentService.ensureReady();
  const [{ tab }, rows] = await Promise.all([
    searchParams,
    contentRepository.listTypesForAdminHub(),
  ]);
  const withTranslations = await loadAdminRowsWithLocalizedFields(
    "ContentType",
    rows,
    ["name", "labelSingular", "labelPlural"],
    "labelPlural",
  );

  const collectionRows = rows.flatMap((row) => row.collections);
  const collectionsWithNames = await loadAdminRowsWithLocalizedFields(
    "ContentCollection",
    collectionRows,
    ["name"],
    "name",
  );
  const collectionNameById = new Map(
    collectionsWithNames.map((collection) => [collection.id, collection.displayTitle || collection.slug]),
  );

  const types: HubContentType[] = withTranslations.map((row) => ({
    ...row,
    labelPluralEn: row.displayTitle,
    collections: row.collections.map(
      (collection): HubCollection => ({
        id: collection.id,
        slug: collection.slug,
        name: collectionNameById.get(collection.id) || collection.slug,
        isPublished: collection.isPublished,
      }),
    ),
  }));

  return <ContentHubPage types={types} initialTab={tab} />;
}
