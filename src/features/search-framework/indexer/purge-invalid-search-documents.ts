import { prisma } from "@/lib/prisma";
import { SEARCH_ENTITY_TYPES } from "@/features/search/constants";

/** Removes rows whose entityType is empty or not a valid SearchEntityType (legacy corrupt data). */
export async function purgeInvalidSearchDocuments(): Promise<number> {
  const result = await prisma.searchDocument.deleteMany({
    where: { entityType: { notIn: SEARCH_ENTITY_TYPES } },
  });
  return result.count;
}
