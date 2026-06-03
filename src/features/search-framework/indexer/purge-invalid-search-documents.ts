import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { SEARCH_ENTITY_TYPES } from "@/features/search/constants";

/** Removes rows whose entityType is empty or not a valid SearchEntityType (legacy corrupt data). */
export async function purgeInvalidSearchDocuments(): Promise<number> {
  const result = await prisma.$executeRaw`
    DELETE FROM SearchDocument
    WHERE entityType = ''
       OR entityType NOT IN (${Prisma.join(SEARCH_ENTITY_TYPES)})
  `;
  return Number(result);
}
