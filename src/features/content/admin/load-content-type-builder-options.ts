import { prisma } from "@/lib/prisma";
import { loadAdminRowsWithLocalizedFields } from "@/features/translation/admin-entity-helpers";
import { resolveContentTypeLabelPlural, selectFieldsFromSchema } from "@/features/content/content-type.registry";
import type { ContentTypeOption } from "@/types/builder";

export async function loadContentTypeOptionsForBuilder(): Promise<ContentTypeOption[]> {
  const rows = await prisma.contentType.findMany({
    where: { isEnabled: true },
    orderBy: { sortOrder: "asc" },
    select: {
      id: true,
      slug: true,
      isEnabled: true,
      fieldSchema: true,
      collections: {
        orderBy: { sortOrder: "asc" },
        select: { id: true, slug: true },
      },
    },
  });

  const localizedTypes = await loadAdminRowsWithLocalizedFields(
    "ContentType",
    rows,
    ["labelPlural", "name"],
    "labelPlural",
  );

  const collectionRows = rows.flatMap((row) => row.collections);
  const localizedCollections = await loadAdminRowsWithLocalizedFields(
    "ContentCollection",
    collectionRows,
    ["name"],
    "name",
  );
  const collectionNameById = new Map(
    localizedCollections.map((collection) => [collection.id, collection.displayTitle || collection.slug]),
  );

  return localizedTypes.map((type) => ({
    slug: type.slug,
    labelPlural:
      type.displayTitle?.trim() ||
      resolveContentTypeLabelPlural(type.slug, type.slug),
    isEnabled: type.isEnabled,
    collections: type.collections.map((collection) => ({
      slug: collection.slug,
      name: collectionNameById.get(collection.id) || collection.slug,
    })),
    selectFields: selectFieldsFromSchema(type.fieldSchema, type.slug),
  }));
}
