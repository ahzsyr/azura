/**
 * Idempotent CONTENT scope migration:
 * ContentCollection → Category(scope=CONTENT, scopeOwnerId=contentTypeId)
 * + ContentCollectionItem / primary collectionId → MANUAL memberships
 */
import "server-only";

import { prisma } from "@/lib/prisma";
import { categoryRepository } from "@/repositories/category.repository";
import type { CategoryWriteInput } from "@/features/categories/types";

export type ContentCategoryMigrationReport = {
  categoriesMigrated: number;
  membershipsCreated: number;
  errors: string[];
};

export async function migrateContentCategories(): Promise<ContentCategoryMigrationReport> {
  const report: ContentCategoryMigrationReport = {
    categoriesMigrated: 0,
    membershipsCreated: 0,
    errors: [],
  };

  const collections = await prisma.contentCollection.findMany({
    orderBy: [{ sortOrder: "asc" }, { slug: "asc" }],
  });
  const idMap = new Map<string, string>();

  for (const col of collections) {
    try {
      const display =
        col.displayProfile && typeof col.displayProfile === "object"
          ? (col.displayProfile as Record<string, unknown>)
          : {};
      const input: CategoryWriteInput = {
        id: col.id,
        slug: col.slug,
        scope: "CONTENT",
        scopeOwnerId: col.contentTypeId,
        parentId: null,
        sortOrder: col.sortOrder,
        visible: col.isPublished,
        showInNav: true,
        featured: false,
        membershipMode: "MANUAL",
        conditions: { match: "any", children: [] },
        metadata: {
          name: typeof display.name === "string" ? display.name : col.slug,
          description: typeof display.excerpt === "string" ? display.excerpt : "",
          legacy: { table: "ContentCollection", id: col.id },
        },
      };
      const saved = await categoryRepository.upsert(input);
      idMap.set(col.id, saved.id);
      report.categoriesMigrated += 1;
    } catch (e) {
      report.errors.push(
        `ContentCollection ${col.slug}: ${e instanceof Error ? e.message : String(e)}`
      );
    }
  }

  const memberships = await prisma.contentCollectionItem.findMany();
  for (const m of memberships) {
    const categoryId = idMap.get(m.collectionId) ?? m.collectionId;
    try {
      await categoryRepository.assignMembership({
        categoryId,
        entityId: m.itemId,
        entityKind: "contentItem",
        source: "MANUAL",
        sortOrder: m.sortOrder,
      });
      report.membershipsCreated += 1;
    } catch (e) {
      report.errors.push(
        `membership item=${m.itemId} col=${m.collectionId}: ${e instanceof Error ? e.message : String(e)}`
      );
    }
  }

  // Primary collectionId on items (may duplicate membership — assignMembership is idempotent)
  const itemsWithPrimary = await prisma.contentItem.findMany({
    where: { collectionId: { not: null } },
    select: { id: true, collectionId: true },
  });
  for (const item of itemsWithPrimary) {
    if (!item.collectionId) continue;
    const categoryId = idMap.get(item.collectionId) ?? item.collectionId;
    try {
      await categoryRepository.assignMembership({
        categoryId,
        entityId: item.id,
        entityKind: "contentItem",
        source: "MANUAL",
      });
      report.membershipsCreated += 1;
    } catch (e) {
      report.errors.push(
        `primary item=${item.id} col=${item.collectionId}: ${e instanceof Error ? e.message : String(e)}`
      );
    }
  }

  return report;
}
